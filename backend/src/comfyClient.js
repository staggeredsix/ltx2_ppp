import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';

export class ComfyClient {
  constructor({ baseUrl = 'http://127.0.0.1:8188', outputDir, inputDir }) {
    this.baseUrl = baseUrl;
    this.outputDir = outputDir;
    this.inputDir = inputDir;
    this.clientId = randomUUID();
    this.promptJobMap = new Map();
    this.watchers = new Map();
    this.connectWs();
  }

  wsUrl() {
    return this.baseUrl.replace('http', 'ws') + `/ws?clientId=${this.clientId}`;
  }

  connectWs() {
    this.ws = new WebSocket(this.wsUrl());
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      const promptId = msg?.data?.prompt_id;
      if (!promptId) return;
      const watcher = this.watchers.get(promptId);
      if (!watcher) return;
      if (msg.type === 'progress') watcher.onProgress(msg.data);
      if (msg.type === 'executing' && msg.data.node === null) watcher.onDone();
      if (msg.type === 'execution_error') watcher.onError(new Error(msg.data?.exception_message || 'ComfyUI execution error'));
    });
    this.ws.on('error', () => {});
    this.ws.on('close', () => setTimeout(() => this.connectWs(), 1000));
  }

  async health() {
    try {
      const r = await fetch(`${this.baseUrl}/system_stats`);
      return r.ok;
    } catch {
      return false;
    }
  }

  async submitWorkflow(workflow, jobId, callbacks) {
    const res = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: this.clientId })
    });
    if (!res.ok) throw new Error(`ComfyUI /prompt failed: ${res.status}`);
    const body = await res.json();
    const promptId = body.prompt_id;
    this.promptJobMap.set(promptId, jobId);
    this.watchers.set(promptId, callbacks);
    return promptId;
  }

  locateOutput(jobId) {
    const files = fs.existsSync(this.outputDir) ? fs.readdirSync(this.outputDir) : [];
    const match = files.find((f) => f.startsWith(`${jobId}_`) && f.endsWith('.mp4'));
    return match ? path.join(this.outputDir, match) : null;
  }
}
