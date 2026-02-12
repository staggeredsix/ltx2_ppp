import dgram from 'dgram';
import { Bonjour } from 'bonjour-service';

export function startDiscovery({ port, comfyPort, version }) {
  const bonjour = new Bonjour();
  const service = bonjour.publish({
    name: 'GenB-Roll',
    type: 'genbroll',
    port,
    txt: {
      version,
      apiPort: String(port),
      comfyPort: String(comfyPort),
      capabilities: 'frame,clip,queue,ws'
    }
  });

  const udp = dgram.createSocket('udp4');
  udp.on('message', (msg, rinfo) => {
    const text = msg.toString('utf8').trim();
    if (text !== 'GENBROLL_DISCOVER') return;
    const payload = JSON.stringify({
      name: 'GenB-Roll',
      apiPort: port,
      comfyPort,
      version
    });
    udp.send(payload, rinfo.port, rinfo.address);
  });
  udp.bind(41235, '0.0.0.0');

  return () => {
    service.stop();
    bonjour.unpublishAll(() => bonjour.destroy());
    udp.close();
  };
}
