import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ComfyClient } from './comfyClient.js';
import { patchWorkflow } from './workflowPatcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error('Usage: npm run comfy:test -- /path/to/image.png');
  process.exit(1);
}

const comfyRoot = path.resolve(process.env.COMFY_ROOT || path.join(__dirname, '../../comfy/ComfyUI'));
const inputDir = path.join(comfyRoot, 'input', 'genbroll', 'cli-test');
const outputDir = path.join(comfyRoot, 'output');
fs.mkdirSync(inputDir, { recursive: true });
const basename = path.basename(input);
fs.copyFileSync(input, path.join(inputDir, basename));

const workflow = patchWorkflow(path.resolve(__dirname, '../workflows/ltx2_video2video_template.json'), {
  prompt: 'cinematic b-roll motion',
  seed: Math.floor(Math.random() * 99999),
  inputFilename: path.join('genbroll', 'cli-test', basename),
  outputPrefix: `cli_test_${Date.now()}`
});

const client = new ComfyClient({ baseUrl: process.env.COMFY_URL || 'http://127.0.0.1:8188', outputDir, inputDir });
const jobId = `cli-${Date.now()}`;
console.log('Submitting workflow to ComfyUI...');
await client.submitWorkflow(workflow, jobId, {
  onProgress: (d) => console.log('Progress', d.value, '/', d.max),
  onDone: () => {
    console.log('Done. Check ComfyUI output folder for cli_test_*.mp4');
    process.exit(0);
  },
  onError: (e) => {
    console.error('Execution error', e.message);
    process.exit(2);
  }
});
