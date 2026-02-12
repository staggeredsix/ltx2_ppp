import fs from 'fs';
import path from 'path';

const DATA_ROOT = path.resolve(process.cwd(), 'backend/data');
const STATE_FILE = path.join(DATA_ROOT, 'jobs_state.json');

export function ensureDirs() {
  for (const rel of ['uploads', 'outputs', 'logs']) {
    fs.mkdirSync(path.join(DATA_ROOT, rel), { recursive: true });
  }
}

export function jobDir(jobId, kind = 'uploads') {
  const dir = path.join(DATA_ROOT, kind, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function logPath(jobId) {
  return path.join(DATA_ROOT, 'logs', `${jobId}.log`);
}

export function appendJobLog(jobId, line) {
  fs.appendFileSync(logPath(jobId), `[${new Date().toISOString()}] ${line}\n`);
}

export function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { jobs: {} };
  }
}

export function outputFile(jobId, filename) {
  return path.join(jobDir(jobId, 'outputs'), filename);
}

export function getDataRoot() {
  return DATA_ROOT;
}
