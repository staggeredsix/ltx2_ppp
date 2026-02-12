async function checkHost(host, port, timeoutMs = 350) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`http://${host}:${port}/health`, { signal: ctl.signal });
    if (!res.ok) return null;
    const body = await res.json();
    if (body?.ok) return { host, port };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  return null;
}

export async function discoverBackend(port = 31977) {
  const quick = ['127.0.0.1', 'localhost'];
  for (const h of quick) {
    const found = await checkHost(h, port, 500);
    if (found) return found;
  }

  const prefixes = ['192.168.1.', '192.168.0.', '10.0.0.'];
  for (const prefix of prefixes) {
    const candidates = [];
    for (let i = 2; i < 32; i++) candidates.push(checkHost(`${prefix}${i}`, port));
    const results = await Promise.all(candidates);
    const match = results.find(Boolean);
    if (match) return match;
  }

  throw new Error('No GenB-Roll backend discovered on local network.');
}
