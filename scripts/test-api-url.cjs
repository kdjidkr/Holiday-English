const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/core/apiUrl.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function load({base = '', dev = false, location} = {}) {
  const mod = { exports: {} };
  vm.runInNewContext(source, {
    module: mod, exports: mod.exports,
    process: { env: { EXPO_PUBLIC_API_BASE_URL: base } },
    __DEV__: dev,
    require: () => ({ apiFetch: async () => ({ ok: true, json: async () => ({ ticket: 'one-time-ticket' }) }) }),
    ...(location ? { window: { location } } : {}),
    URL,
  });
  return mod.exports;
}

assert.equal(load({ base: 'https://api.example.com/' }).apiUrl('/api/jev'), 'https://api.example.com/api/jev');
assert.equal(load({ dev: true, location: { protocol: 'http:', hostname: '192.168.1.8', href: 'http://192.168.1.8:8081/' } }).apiUrl('/api/jev'), 'http://192.168.1.8:3000/api/jev');
const production = load({ location: { protocol: 'https:', hostname: 'app.example.com', href: 'https://app.example.com/' } });
assert.equal(production.apiUrl('/api/jev'), '/api/jev');
production.geminiLiveSocketUrl('models/gemini-3.8-live').then(url => {
  assert.equal(url, 'wss://app.example.com/api/gemini/live?model=gemini-3.8-live&ticket=one-time-ticket');
  console.log('PASS: configured mobile API host, local development host and short-lived authenticated Live WebSocket URLs');
}).catch(error => { console.error(error); process.exitCode = 1; });
