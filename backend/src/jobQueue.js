import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { appendJobLog, jobDir, saveState } from './storage.js';
import { patchWorkflow } from './workflowPatcher.js';

export class JobQueue {
  constructor({ comfyClient, wsHub, templatePath, comfyInputDir, state }) {
    this.comfyClient = comfyClient;
    this.wsHub = wsHub;
    this.templatePath = templatePath;
    this.comfyInputDir = comfyInputDir;
    this.jobs = state.jobs || {};
    this.pending = [];
    this.running = null;
  }

  queueDepth() {
    return this.pending.length + (this.running ? 1 : 0);
  }

  allJobs() {
    return this.jobs;
  }

  submit(meta) {
    const jobId = randomUUID();
    const job = {
      id: jobId,
      status: 'pending',
      createdAt: Date.now(),
      prompt: meta.prompt,
      seed: meta.seed === 'random' ? Math.floor(Math.random() * 1_000_000_000) : Number(meta.seed || 1),
      inputFilename: meta.filename,
      originalName: meta.originalName,
      parentJobId: meta.parentJobId || null
    };
    this.jobs[jobId] = job;
    this.pending.push(jobId);
    this.persist();
    this.wsHub.broadcast({ type: 'JOB_STATUS', jobId, status: 'pending', queueDepth: this.queueDepth() });
    this.runNext();
    return job;
  }

  persist() {
    saveState({ jobs: this.jobs });
  }

  async runNext() {
    if (this.running || this.pending.length === 0) return;
    const jobId = this.pending.shift();
    this.running = jobId;
    const job = this.jobs[jobId];
    job.status = 'running';
    this.wsHub.broadcast({ type: 'JOB_STATUS', jobId, status: 'running', queueDepth: this.queueDepth() });
    appendJobLog(jobId, 'Starting job');

    try {
      const comfyJobInputDir = path.join(this.comfyInputDir, 'genbroll', jobId);
      fs.mkdirSync(comfyJobInputDir, { recursive: true });
      const src = path.join(jobDir(jobId), job.inputFilename);
      const dst = path.join(comfyJobInputDir, job.inputFilename);
      fs.copyFileSync(src, dst);

      const workflow = patchWorkflow(this.templatePath, {
        prompt: job.prompt,
        seed: job.seed,
        inputFilename: path.join('genbroll', jobId, job.inputFilename),
        outputPrefix: `${jobId}_genbroll`
      });

      await this.comfyClient.submitWorkflow(workflow, jobId, {
        onProgress: (data) => {
          this.wsHub.broadcast({
            type: 'JOB_PROGRESS',
            jobId,
            value: data.value,
            max: data.max,
            queueDepth: this.queueDepth()
          });
        },
        onDone: () => this.finishJob(jobId),
        onError: (error) => this.failJob(jobId, error)
      });
    } catch (err) {
      this.failJob(jobId, err);
    }
  }

  finishJob(jobId) {
    const job = this.jobs[jobId];
    const out = this.comfyClient.locateOutput(jobId);
    if (!out) return this.failJob(jobId, new Error('Could not find generated mp4 in ComfyUI output directory.'));
    job.status = 'completed';
    job.resultPath = out;
    appendJobLog(jobId, `Completed: ${out}`);
    this.persist();
    this.wsHub.broadcast({ type: 'JOB_RESULT', jobId, status: 'completed', downloadUrl: `/jobs/${jobId}/result` });
    this.running = null;
    this.runNext();
  }

  failJob(jobId, err) {
    const job = this.jobs[jobId];
    job.status = 'failed';
    job.error = String(err.message || err);
    appendJobLog(jobId, `Failed: ${job.error}`);
    this.persist();
    this.wsHub.broadcast({ type: 'JOB_STATUS', jobId, status: 'failed', error: job.error });
    this.running = null;
    this.runNext();
  }
}
