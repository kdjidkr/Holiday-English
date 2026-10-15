const assert = require('node:assert/strict');

async function run() {
  const oldPort = process.env.PORT;
  const oldNodeEnv = process.env.NODE_ENV;
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  process.env.PORT = '0';
  process.env.NODE_ENV = 'production';
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
    assert.equal(home.status, 200);
    assert.match(await home.text(), /<!DOCTYPE html>/i);
    assert.equal(isAllowedOrigin(`http://127.0.0.1:${address.port}`, `127.0.0.1:${address.port}`), true);
    assert.equal(isAllowedOrigin('https://attacker.example', `127.0.0.1:${address.port}`), false);
    const missingSecret = await fetch(`${base}/api/gemini/models/gemini-3.5-flash-lite:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(missingSecret.status, 503);
    assert.deepEqual(await missingSecret.json(), { error: 'GEMINI_NOT_CONFIGURED' });
    const deniedOrigin = await fetch(`${base}/healthz`, { headers: { Origin: 'https://attacker.example' } });
    assert.equal(deniedOrigin.status, 403);
    console.log('PASS: server health, origin filtering, and server-only Gemini key requirement');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (oldPort === undefined) delete process.env.PORT; else process.env.PORT = oldPort;
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldGeminiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGeminiKey;
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
