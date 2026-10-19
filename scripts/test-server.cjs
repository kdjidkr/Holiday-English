const assert = require('node:assert/strict');

async function run() {
  const oldPort = process.env.PORT;
  const oldNodeEnv = process.env.NODE_ENV;
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  const oldPassword = process.env.APP_ACCESS_PASSWORD;
  const oldSessionSecret = process.env.APP_SESSION_SECRET;
  const oldServeWeb = process.env.SERVE_WEB;
  process.env.PORT = '0';
  process.env.NODE_ENV = 'production';
  process.env.APP_ACCESS_PASSWORD = 'test-access-password';
  process.env.APP_SESSION_SECRET = 'test-session-secret-with-enough-entropy';
  delete process.env.SERVE_WEB;
  delete process.env.GEMINI_API_KEY;
  const { server, isAllowedOrigin } = require('../server/index.js');
  try {
    server.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const address = server.address();
    const base = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const home = await fetch(base);
    assert.equal(home.status, 404);
    assert.deepEqual(await home.json(), { error: 'API_ONLY_SERVER' });
    assert.equal(isAllowedOrigin(`http://127.0.0.1:${address.port}`, `127.0.0.1:${address.port}`), true);
    assert.equal(isAllowedOrigin('https://attacker.example', `127.0.0.1:${address.port}`), false);
    const unauthenticated = await fetch(`${base}/api/gemini/models/gemini-3.5-flash-lite:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(unauthenticated.status, 401);
    assert.deepEqual(await unauthenticated.json(), { error: 'UNAUTHORIZED' });
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-access-password' }) });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const session = await fetch(`${base}/api/auth/session`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(session.status, 200);
    const missingSecret = await fetch(`${base}/api/gemini/models/gemini-3.5-flash-lite:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}',
    });
    assert.equal(missingSecret.status, 503);
    assert.deepEqual(await missingSecret.json(), { error: 'GEMINI_NOT_CONFIGURED' });
    const ticketResponse = await fetch(`${base}/api/auth/ws-ticket`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(ticketResponse.status, 200);
    assert.ok((await ticketResponse.json()).ticket);
    const deniedOrigin = await fetch(`${base}/healthz`, { headers: { Origin: 'https://attacker.example' } });
    assert.equal(deniedOrigin.status, 403);
    console.log('PASS: API-only hosting, login/session gate, websocket tickets, origin filtering, and server-only Gemini key requirement');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (oldPort === undefined) delete process.env.PORT; else process.env.PORT = oldPort;
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldGeminiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGeminiKey;
    if (oldPassword === undefined) delete process.env.APP_ACCESS_PASSWORD; else process.env.APP_ACCESS_PASSWORD = oldPassword;
    if (oldSessionSecret === undefined) delete process.env.APP_SESSION_SECRET; else process.env.APP_SESSION_SECRET = oldSessionSecret;
    if (oldServeWeb === undefined) delete process.env.SERVE_WEB; else process.env.SERVE_WEB = oldServeWeb;
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
