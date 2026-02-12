function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
}

export class ApiClient {
  constructor(base) {
    this.base = base;
    this.ws = null;
    this.handlers = [];
  }

  async connect() {
    const wsUrl = this.base.replace('http', 'ws') + '/ws';
    this.ws = new WebSocket(wsUrl);
    await waitForOpen(this.ws);
    this.ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      const msg = JSON.parse(ev.data);
      this.handlers.forEach((h) => h(msg));
    };
    this.send({ type: 'HELLO', source: 'uxp-panel' });
  }

  onMessage(handler) {
    this.handlers.push(handler);
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }

  async uploadAndSubmit({ uploadId, filename, bytes, prompt, seed = 'random', parentJobId = null }) {
    this.send({ type: 'FILE_BEGIN', uploadId, filename });
    this.ws.send(bytes.buffer);
    this.send({ type: 'FILE_END', uploadId });
    this.send({ type: 'JOB_SUBMIT', uploadId, prompt, seed, parentJobId, originalName: filename });
  }
}
