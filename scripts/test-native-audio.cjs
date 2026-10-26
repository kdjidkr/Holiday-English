const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/core/geminiLive.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(source, {
  module: testModule, exports: testModule.exports,
  require: name => name === './apiUrl' ? { geminiLiveSocketUrl: async () => '' } : name === 'react-native' ? { Platform: { OS: 'ios' } } : name === 'expo-av' ? { Audio: {} } : name === 'expo-file-system' ? {} : require(name),
  setTimeout, clearTimeout, atob: value => Buffer.from(value, 'base64').toString('binary'),
});

const { pcmToWav, bytesToBase64 } = testModule.exports;
const pcm = Uint8Array.from([0x00, 0x00, 0xff, 0x7f, 0x00, 0x80]);
const wav = pcmToWav(pcm, 24000);
const view = new DataView(wav.buffer);
const fourcc = offset => String.fromCharCode(...wav.slice(offset, offset + 4));
assert.equal(fourcc(0), 'RIFF');
assert.equal(view.getUint32(4, true), 36 + pcm.length);
assert.equal(fourcc(8), 'WAVE');
assert.equal(view.getUint16(20, true), 1);
assert.equal(view.getUint16(22, true), 1);
assert.equal(view.getUint32(24, true), 24000);
assert.equal(view.getUint16(34, true), 16);
assert.deepEqual(Array.from(wav.slice(44)), Array.from(pcm));
assert.equal(bytesToBase64(Uint8Array.from([0, 1, 2, 250, 251])), Buffer.from([0, 1, 2, 250, 251]).toString('base64'));
console.log('PASS: native Gemini PCM is wrapped as a valid 24 kHz mono WAV for iOS/Android playback');
