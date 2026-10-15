const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');
const WebSocket = require('ws');
const { createJevMiddleware } = require('../scripts/jevProxy.cjs');

const projectRoot = path.resolve(__dirname, '..');
if (require.main === module) {
  try { require('@expo/env').load(projectRoot); } catch { /* Render provides environment variables directly. */ }
}

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const LIVE_PATH = '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const WEB_DIR = path.join(projectRoot, 'dist');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const allowedTextModels = new Set((process.env.GEMINI_TEXT_MODELS || 'gemini-3.5-flash-lite').split(',').map(value => value.trim()).filter(Boolean));
const allowedTtsModels = new Set((process.env.GEMINI_TTS_MODELS || 'gemini-3.8-flash-lite-tts').split(',').map(value => value.trim()).filter(Boolean));
const allowedLiveModels = new Set((process.env.GEMINI_LIVE_MODELS || 'gemini-3.8-live').split(',').map(value => value.trim()).filter(Boolean));
const requestCounts = new Map();
const liveConnections = new Map();

function geminiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

function isDevelopment() { return process.env.NODE_ENV === 'development'; }

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1' ||
    /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

function isAllowedOrigin(origin, requestHost) {
  if (!origin) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.host === requestHost) return true;
  return isDevelopment() && isLocalHost(parsed.hostname);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    if (!isAllowedOrigin(origin, req.headers.host || '')) return false;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return true;
}

function sendJson(res, status, value) {
  if (res.writableEnded || res.destroyed) return;
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function allowRequest(req, res) {
  const now = Date.now();
  const ip = req.socket.remoteAddress || 'unknown';
  const current = requestCounts.get(ip);
  const state = current && now - current.start < 60_000 ? current : { start: now, count: 0 };
  state.count++;
  requestCounts.set(ip, state);
  if (requestCounts.size > 2000) for (const [key, item] of requestCounts) if (now - item.start > 60_000) requestCounts.delete(key);
  if (state.count <= 120) return true;
  sendJson(res, 429, { error: 'RATE_LIMITED' });
  return false;
}

function readJson(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let settled = false;
    req.on('data', chunk => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        settled = true;
        reject(Object.assign(new Error('REQUEST_TOO_LARGE'), { status: 413 }));
      } else body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(Object.assign(new Error('INVALID_JSON'), { status: 400 })); }
    });
    req.on('error', error => reject(error));
  });
}

async function proxyGemini(req, res, pathName, model) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }
  const key = geminiKey();
  if (!key) return sendJson(res, 503, { error: 'GEMINI_NOT_CONFIGURED' });

  let payload;
  try { payload = await readJson(req); }
  catch (error) { return sendJson(res, error.status || 400, { error: error.message || 'INVALID_REQUEST' }); }
  const url = pathName === '/api/gemini/interactions'
    ? 'https://generativelanguage.googleapis.com/v1beta/interactions'
    : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const permitted = pathName === '/api/gemini/interactions' ? allowedTtsModels.has(payload.model) : allowedTextModels.has(model);
  if (!permitted) return sendJson(res, 400, { error: 'MODEL_NOT_ALLOWED' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  const abortOnClose = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', abortOnClose);
  try {
    const upstream = await fetch(url, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
    });
    const data = Buffer.from(await upstream.arrayBuffer());
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store', 'Content-Length': data.length,
    });
    res.end(data);
  } catch (error) {
    sendJson(res, controller.signal.aborted ? 504 : 502, { error: controller.signal.aborted ? 'GEMINI_TIMEOUT' : 'GEMINI_UNAVAILABLE' });
  } finally {
    clearTimeout(timer);
    res.off('close', abortOnClose);
  }
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { return sendJson(res, 400, { error: 'INVALID_PATH' }); }
  const candidate = path.resolve(WEB_DIR, `.${decoded}`);
  const file = candidate.startsWith(`${WEB_DIR}${path.sep}`) || candidate === path.join(WEB_DIR, 'index.html') ? candidate : path.join(WEB_DIR, 'index.html');
  let target = file;
  try { if (!fs.statSync(target).isFile()) target = path.join(WEB_DIR, 'index.html'); }
  catch { target = path.join(WEB_DIR, 'index.html'); }
  fs.readFile(target, (error, content) => {
    if (error) return sendJson(res, 503, { error: 'WEB_BUILD_NOT_FOUND', hint: 'Run npm run build:web before starting the production server.' });
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Length': content.length,
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
}

const jev = createJevMiddleware();
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; }
  catch { return sendJson(res, 400, { error: 'INVALID_URL' }); }
  if (!applyCors(req, res)) return sendJson(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) { res.writeHead(204); return res.end(); }
  if (pathname.startsWith('/api/') && !allowRequest(req, res)) return;

  jev(req, res, () => {
    if (pathname === '/healthz') return sendJson(res, 200, { status: 'ok' });
    const generateMatch = pathname.match(/^\/api\/gemini\/models\/([A-Za-z0-9._-]+):generateContent$/);
    if (generateMatch) return void proxyGemini(req, res, pathname, generateMatch[1]);
    if (pathname === '/api/gemini/interactions') return void proxyGemini(req, res, pathname);
    if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'NOT_FOUND' });
    return void serveStatic(req, res, pathname);
  });
});

const sockets = new WebSocket.WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
server.on('upgrade', (req, socket, head) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
  if (url.pathname !== '/api/gemini/live' || !isAllowedOrigin(req.headers.origin, req.headers.host || '')) { socket.destroy(); return; }
  const model = (url.searchParams.get('model') || 'gemini-3.8-live').replace(/^models\//, '');
  if (!allowedLiveModels.has(model) || !geminiKey()) { socket.destroy(); return; }
  const ip = req.socket.remoteAddress || 'unknown';
  const active = liveConnections.get(ip) || 0;
  if (active >= 3) { socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
  liveConnections.set(ip, active + 1);
  sockets.handleUpgrade(req, socket, head, browserSocket => {
    const upstreamUrl = `wss://generativelanguage.googleapis.com${LIVE_PATH}?key=${encodeURIComponent(geminiKey())}`;
    const upstream = new WebSocket(upstreamUrl, { maxPayload: 1024 * 1024 });
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      const remaining = Math.max(0, (liveConnections.get(ip) || 1) - 1);
      if (remaining) liveConnections.set(ip, remaining); else liveConnections.delete(ip);
      if (browserSocket.readyState === WebSocket.OPEN || browserSocket.readyState === WebSocket.CONNECTING) browserSocket.close();
      if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
    };
    let queued = [];
    upstream.on('open', () => {
      for (const [data, binary] of queued) if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary });
      queued = [];
    });
    browserSocket.on('message', (data, binary) => {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary });
      else if (upstream.readyState === WebSocket.CONNECTING && queued.length < 10) queued.push([data, binary]);
    });
    upstream.on('message', (data, binary) => { if (browserSocket.readyState === WebSocket.OPEN) browserSocket.send(data, { binary }); });
    browserSocket.on('close', cleanup);
    upstream.on('close', cleanup);
    browserSocket.on('error', cleanup);
    upstream.on('error', cleanup);
  });
});

if (require.main === module) server.listen(PORT, HOST, () => console.log(`Holiday-English server listening on ${HOST}:${PORT}`));

module.exports = { server, isAllowedOrigin };
