const http = require('node:http');
const { URL } = require('node:url');
const WebSocket = require('ws');
const { createJevMiddleware } = require('../scripts/jevProxy.cjs');

const projectRoot = require('node:path').resolve(__dirname, '..');
if (require.main === module) {
  try { require('@expo/env').load(projectRoot); } catch { /* Render provides environment variables directly. */ }
}

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const LIVE_PATH = '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const allowedTextModels = new Set((process.env.GEMINI_TEXT_MODELS || 'gemini-3.5-flash-lite').split(',').map(value => value.trim()).filter(Boolean));
const allowedTtsModels = new Set((process.env.GEMINI_TTS_MODELS || 'gemini-3.8-flash-lite-tts').split(',').map(value => value.trim()).filter(Boolean));
const allowedLiveModels = new Set((process.env.GEMINI_LIVE_MODELS || 'gemini-3.8-live').split(',').map(value => value.trim()).filter(Boolean));
const requestCounts = new Map();
const liveConnections = new Map();
const loginAttempts = new Map();
const websocketTickets = new Map();
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  return true;
}

function sendJson(res, status, value) {
  if (res.writableEnded || res.destroyed) return;
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function authConfigReady() {
  return Boolean((process.env.APP_ACCESS_PASSWORD || '').trim() && (process.env.APP_SESSION_SECRET || '').trim());
}

function signSession(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = require('node:crypto').createHmac('sha256', process.env.APP_SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySession(token) {
  if (!authConfigReady() || typeof token !== 'string') return false;
  const [encoded, supplied, extra] = token.split('.');
  if (!encoded || !supplied || extra) return false;
  const expected = require('node:crypto').createHmac('sha256', process.env.APP_SESSION_SECRET).update(encoded).digest();
  let actual;
  try { actual = Buffer.from(supplied, 'base64url'); } catch { return false; }
  if (actual.length !== expected.length || !require('node:crypto').timingSafeEqual(actual, expected)) return false;
  try { const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()); return Number(payload.exp) > Math.floor(Date.now() / 1000); }
  catch { return false; }
}

function bearerToken(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

function allowLoginAttempt(req, res) {
  const now = Date.now();
  const ip = req.socket.remoteAddress || 'unknown';
  const current = loginAttempts.get(ip);
  const state = current && now - current.start < 15 * 60_000 ? current : { start: now, count: 0 };
  state.count++;
  loginAttempts.set(ip, state);
  if (loginAttempts.size > 2000) for (const [key, item] of loginAttempts) if (now - item.start > 15 * 60_000) loginAttempts.delete(key);
  if (state.count <= 10) return true;
  sendJson(res, 429, { error: 'RATE_LIMITED' });
  return false;
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' }); }
  if (!allowLoginAttempt(req, res)) return;
  if (!authConfigReady()) return sendJson(res, 503, { error: 'APP_AUTH_NOT_CONFIGURED' });
  let payload;
  try { payload = await readJson(req, 4096); }
  catch (error) { return sendJson(res, error.status || 400, { error: error.message || 'INVALID_REQUEST' }); }
  const expected = require('node:crypto').createHash('sha256').update(process.env.APP_ACCESS_PASSWORD.trim()).digest();
  const supplied = require('node:crypto').createHash('sha256').update(String(payload.password || '')).digest();
  if (!require('node:crypto').timingSafeEqual(expected, supplied)) return sendJson(res, 401, { error: 'INVALID_PASSWORD' });
  const now = Math.floor(Date.now() / 1000);
  return sendJson(res, 200, { token: signSession({ iat: now, exp: now + SESSION_TTL_SECONDS }), expiresAt: (now + SESSION_TTL_SECONDS) * 1000 });
}

async function handleWebsocketTicket(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' }); }
  if (!isDevelopment() && !verifySession(bearerToken(req))) return sendJson(res, 401, { error: 'UNAUTHORIZED' });
  const ticket = require('node:crypto').randomBytes(32).toString('base64url');
  websocketTickets.set(ticket, Date.now() + 60_000);
  return sendJson(res, 200, { ticket });
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

const jev = createJevMiddleware();
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; }
  catch { return sendJson(res, 400, { error: 'INVALID_URL' }); }
  if (!applyCors(req, res)) return sendJson(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) { res.writeHead(204); return res.end(); }
  if (pathname.startsWith('/api/') && !allowRequest(req, res)) return;

  if (pathname === '/api/auth/login') return void handleLogin(req, res);
  if (pathname === '/healthz') return sendJson(res, 200, { status: 'ok' });
  if (pathname.startsWith('/api/') && !isDevelopment() && !verifySession(bearerToken(req))) return sendJson(res, 401, { error: 'UNAUTHORIZED' });
  if (pathname === '/api/auth/session') return sendJson(res, 200, { valid: true });
  if (pathname === '/api/auth/ws-ticket') return void handleWebsocketTicket(req, res);

  jev(req, res, () => {
    const generateMatch = pathname.match(/^\/api\/gemini\/models\/([A-Za-z0-9._-]+):generateContent$/);
    if (generateMatch) return void proxyGemini(req, res, pathname, generateMatch[1]);
    if (pathname === '/api/gemini/interactions') return void proxyGemini(req, res, pathname);
    if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'NOT_FOUND' });
    return sendJson(res, 404, { error: 'API_ONLY_SERVER' });
  });
});

const sockets = new WebSocket.WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
server.on('upgrade', (req, socket, head) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
  if (url.pathname !== '/api/gemini/live' || !isAllowedOrigin(req.headers.origin, req.headers.host || '')) { socket.destroy(); return; }
  if (isDevelopment() === false) {
    const ticket = url.searchParams.get('ticket') || '';
    const expiresAt = websocketTickets.get(ticket);
    websocketTickets.delete(ticket);
    if (!expiresAt || expiresAt < Date.now()) { socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
  }
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
