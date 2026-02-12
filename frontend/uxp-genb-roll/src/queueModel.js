export class QueueModel {
  constructor() {
    this.jobs = new Map();
    this.lastJobId = null;
  }

  upsert(jobId, patch) {
    const curr = this.jobs.get(jobId) || { id: jobId, status: 'pending', progress: 0 };
    const next = { ...curr, ...patch };
    this.jobs.set(jobId, next);
    this.lastJobId = jobId;
    return next;
  }

  queueDepth() {
    let n = 0;
    for (const j of this.jobs.values()) if (j.status === 'pending' || j.status === 'running') n++;
    return n;
  }

  asList() {
    return [...this.jobs.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }
}
