import { spawn } from 'child_process';

export function transcodeToMp4(input, output) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-i', input, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output]);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`ffmpeg failed (${code}): ${stderr}`));
    });
  });
}
