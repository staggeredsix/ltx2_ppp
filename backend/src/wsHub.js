export class WsHub {
  constructor() {
    this.clients = new Set();
  }

  add(ws) {
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
  }

  send(ws, payload) {
    if (ws?.readyState === 1) ws.send(JSON.stringify(payload));
  }

  broadcast(payload) {
    const wire = JSON.stringify(payload);
    for (const ws of this.clients) {
      if (ws.readyState === 1) ws.send(wire);
    }
  }
}
