import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import mime from 'mime-types';
import { ensureDirs, getDataRoot, jobDir, loadState } from './storage.js';
import { WsHub } from './wsHub.js';
import { ComfyClient } from './comfyClient.js';
import { JobQueue } from './jobQueue.js';
import { startDiscovery } from './mdns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VERSION = '0.1.0';
const API_PORT = Number(process.env.API_PORT || 31977);
const HOST = process.env.HOST || '0.0.0.0';
const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8188';
const COMFY_ROOT = path.resolve(process.env.COMFY_ROOT || path.join(__dirname, '../../comfy/ComfyUI'));
const COMFY_INPUT_DIR = path.join(COMFY_ROOT, 'input');
const COMFY_OUTPUT_DIR = path.join(COMFY_ROOT, 'output');

ensureDirs();
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const comfyClient = new ComfyClient({ baseUrl: COMFY_URL, outputDir: COMFY_OUTPUT_DIR, inputDir: COMFY_INPUT_DIR });
const wsHub = new WsHub();
const queue = new JobQueue({
  comfyClient,
  wsHub,
  templatePath: path.resolve(__dirname, '../workflows/ltx2_video2video_template.json'),
  comfyInputDir: COMFY_INPUT_DIR,
  state: loadState()
});

app.get('/health', async (_req, res) => {
  res.json({ ok: true, version: VERSION, comfyOk: await comfyClient.health(), queueDepth: queue.queueDepth() });
});

app.get('/capabilities', (_req, res) => {
  res.json({ supportsFrames: true, supportsClip: true, maxUploadMB: 300, transport: 'ws', discovery: ['mdns', 'udp'] });
});

app.get('/jobs/:id', (req, res) => {
  const job = queue.allJobs()[req.params.id];
  if (!job) return res.status(404).json({ error: 'not found' });
  res.json(job);
});

app.get('/jobs/:id/result', (req, res) => {
  const job = queue.allJobs()[req.params.id];
  if (!job?.resultPath || !fs.existsSync(job.resultPath)) return res.status(404).json({ error: 'not found' });
  res.setHeader('Content-Type', mime.lookup(job.resultPath) || 'video/mp4');
  fs.createReadStream(job.resultPath).pipe(res);
});

app.use('/static', express.static(getDataRoot()));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  wsHub.add(ws);
  const uploads = new Map();

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      const upload = uploads.get('active');
      if (!upload) return;
      fs.appendFileSync(upload.path, data);
      upload.bytes += data.length;
      return;
    }

    const msg = JSON.parse(data.toString());

    if (msg.type === 'HELLO') {
      wsHub.send(ws, { type: 'HELLO_ACK', version: VERSION, queueDepth: queue.queueDepth() });
      return;
    }

    if (msg.type === 'FILE_BEGIN') {
      const dir = jobDir(msg.uploadId);
      const filePath = path.join(dir, msg.filename);
      if (fs.existsSync(filePath)) fs.rmSync(filePath);
      uploads.set('active', { uploadId: msg.uploadId, filename: msg.filename, path: filePath, bytes: 0 });
      wsHub.send(ws, { type: 'FILE_ACK', uploadId: msg.uploadId });
      return;
    }

    if (msg.type === 'FILE_END') {
      const upload = uploads.get('active');
      if (!upload) return;
      wsHub.send(ws, { type: 'FILE_STORED', uploadId: upload.uploadId, bytes: upload.bytes });
      uploads.delete('active');
      uploads.set(upload.uploadId, upload);
      return;
    }

    if (msg.type === 'JOB_SUBMIT') {
      const upload = uploads.get(msg.uploadId);
      if (!upload) {
        wsHub.send(ws, { type: 'JOB_STATUS', status: 'failed', error: 'Missing upload for JOB_SUBMIT.' });
        return;
      }
      const job = queue.submit({
        prompt: msg.prompt,
        seed: msg.seed,
        filename: upload.filename,
        originalName: msg.originalName || upload.filename,
        parentJobId: msg.parentJobId
      });
      wsHub.send(ws, { type: 'JOB_ACCEPTED', jobId: job.id, seed: job.seed });
    }
  });
});

server.listen(API_PORT, HOST, () => {
  console.log(`GenB-Roll API running at http://${HOST}:${API_PORT}`);
  const stopDiscovery = startDiscovery({ port: API_PORT, comfyPort: 8188, version: VERSION });
  process.on('SIGINT', () => {
    stopDiscovery();
    process.exit(0);
  });
});
