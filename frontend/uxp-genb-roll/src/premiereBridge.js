function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function pickLocalFallbackFile() {
  if (window.uxp?.storage?.localFileSystem) {
    const fs = window.uxp.storage.localFileSystem;
    const f = await fs.getFileForOpening({ types: ['png', 'jpg', 'jpeg', 'mp4', 'mov'] });
    if (!f) throw new Error('No media chosen.');
    const arr = await f.read({ format: window.uxp.storage.formats.binary });
    return { name: f.name, bytes: new Uint8Array(arr), mode: f.name.match(/mp4|mov/i) ? 'clip' : 'frame' };
  }
  throw new Error('Unable to access UXP file API for fallback media selection.');
}

export async function extractMedia(inputMode) {
  // Premiere UXP APIs are evolving; we use a direct bridge when available.
  const ppro = globalThis.ppro || globalThis.premiere;

  if (ppro?.project?.activeSequence && typeof ppro.project.activeSequence.exportFramePNG === 'function') {
    const tmpName = `genbroll_frame_${nowStamp()}.png`;
    const path = await ppro.project.activeSequence.exportFramePNG(tmpName);
    const data = await window.uxp.storage.localFileSystem.getFileForOpening({ initialLocation: path });
    const arr = await data.read({ format: window.uxp.storage.formats.binary });
    return { name: tmpName, bytes: new Uint8Array(arr), mode: 'frame' };
  }

  // Functional fallback path: user picks the exact frame/clip exported from Premiere.
  // This keeps the flow usable in all environments and still panel-driven.
  return pickLocalFallbackFile();
}
