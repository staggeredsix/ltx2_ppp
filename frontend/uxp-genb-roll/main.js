import { discoverBackend } from './src/discovery.js';
import { ApiClient } from './src/apiClient.js';
import { extractMedia } from './src/premiereBridge.js';
import { QueueModel } from './src/queueModel.js';
import { renderJobs, setError, setupPresetButtons } from './src/ui.js';

const queue = new QueueModel();
let api = null;
let backendBase = null;
let latestDownloadUrl = null;
let lastInput = null;
let lastJobId = null;

const els = {
  prompt: document.getElementById('prompt'),
  inputMode: document.getElementById('inputMode'),
  queueLabel: document.getElementById('queueLabel'),
  jobs: document.getElementById('jobs'),
  generate: document.getElementById('generate'),
  generateAnother: document.getElementById('generateAnother'),
  openOutput: document.getElementById('openOutput'),
  saveOutput: document.getElementById('saveOutput'),
  preview: document.getElementById('preview'),
  error: document.getElementById('error'),
  backendStatus: document.getElementById('backendStatus'),
  presetButtons: document.getElementById('presetButtons')
};

setupPresetButtons(els.presetButtons, els.prompt);

function refreshUi() {
  els.queueLabel.textContent = `Processes in Queue: ${queue.queueDepth()}`;
  renderJobs(els.jobs, queue.asList());
}

async function bootstrap() {
  try {
    const found = await discoverBackend();
    backendBase = `http://${found.host}:${found.port}`;
    els.backendStatus.textContent = `${found.host}:${found.port}`;
    api = new ApiClient(backendBase);
    await api.connect();
    api.onMessage((msg) => {
      if (msg.jobId) {
        if (msg.type === 'JOB_STATUS') queue.upsert(msg.jobId, { status: msg.status, error: msg.error, createdAt: Date.now() });
        if (msg.type === 'JOB_PROGRESS') {
          const progress = msg.max ? Math.round((msg.value / msg.max) * 100) : 0;
          queue.upsert(msg.jobId, { status: 'running', progress });
        }
        if (msg.type === 'JOB_RESULT') {
          queue.upsert(msg.jobId, { status: 'completed', downloadUrl: backendBase + msg.downloadUrl, createdAt: Date.now() });
          latestDownloadUrl = backendBase + msg.downloadUrl;
          els.preview.src = latestDownloadUrl;
          lastJobId = msg.jobId;
        }
      }
      refreshUi();
    });
  } catch (e) {
    setError(els.error, e.message);
    els.backendStatus.textContent = 'not found';
  }
}

els.generate.addEventListener('click', async () => {
  try {
    setError(els.error, '');
    const media = await extractMedia(els.inputMode.value);
    lastInput = media;
    const uploadId = crypto.randomUUID();
    await api.uploadAndSubmit({
      uploadId,
      filename: media.name,
      bytes: media.bytes,
      prompt: els.prompt.value.trim(),
      seed: 'random'
    });
  } catch (e) {
    setError(els.error, e.message);
  }
});

els.generateAnother.addEventListener('click', async () => {
  try {
    if (!lastInput) throw new Error('Generate first to establish input media.');
    const uploadId = crypto.randomUUID();
    await api.uploadAndSubmit({
      uploadId,
      filename: lastInput.name,
      bytes: lastInput.bytes,
      prompt: els.prompt.value.trim(),
      seed: 'random',
      parentJobId: lastJobId
    });
  } catch (e) {
    setError(els.error, e.message);
  }
});

els.openOutput.addEventListener('click', () => {
  if (latestDownloadUrl) window.open(latestDownloadUrl, '_blank');
});

els.saveOutput.addEventListener('click', async () => {
  try {
    if (!latestDownloadUrl) throw new Error('No generated output yet.');
    const res = await fetch(latestDownloadUrl);
    const blob = await res.blob();
    if (!window.uxp?.storage?.localFileSystem) throw new Error('UXP file APIs unavailable.');
    const fs = window.uxp.storage.localFileSystem;
    const out = await fs.getFileForSaving('genbroll-output.mp4');
    if (!out) return;
    const arr = new Uint8Array(await blob.arrayBuffer());
    await out.write(arr.buffer, { format: window.uxp.storage.formats.binary });
  } catch (e) {
    setError(els.error, e.message);
  }
});

bootstrap();
