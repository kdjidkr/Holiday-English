// Generate the fixed introduction with Gemini TTS. Never bundled into the app.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const env = fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '';
const key = process.env.GEMINI_API_KEY || env.match(/^GEMINI_API_KEY\s*=\s*["']?([^\s"']+)/m)?.[1];
const model = 'gemini-2.5-flash-preview-tts';
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/arrival/story.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const directory = path.join(root, 'assets/arrival/gemini');
const voices = { Charlie: 'Achird', Maggie: 'Sulafat' };
function wav(pcm, rate) {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
async function main() {
  if (!key) throw new Error('GEMINI_API_KEY is required');
  fs.mkdirSync(directory, { recursive: true });
  for (const [beat, scene] of Object.entries(context.exports.arrivalLines)) {
    if (beat === 'BOARDING') continue;
    const filename = beat.toLowerCase().replaceAll('_', '-') + '.wav';
    const destination = path.join(directory, filename);
    if (process.argv.includes('--missing-only') && fs.existsSync(destination)) continue;
    const persona = scene.speaker === 'Charlie'
      ? 'a friendly middle-aged male taxi driver, relaxed and reassuring'
      : 'a warm female cafe owner welcoming a new colleague, bright but understated';
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({ contents: [{ parts: [{ text: `Speak in natural native Korean as ${persona}. This is a quiet one-to-one conversation. Use everyday conversational intonation, gentle short pauses, and a comfortable pace. Do not sound like an announcer or read stage directions. Speak ONLY this exact dialogue:\n${scene.line}` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[scene.speaker] } } } } }),
    });
    if (![429, 503].includes(response.status) || attempt === 2) break;
    console.log(`${beat}: waiting for Gemini rate limit (${attempt + 1}/2)`);
    await new Promise(resolve => setTimeout(resolve, 45000));
    }
    if (!response.ok) throw new Error(`${beat}: Gemini HTTP ${response.status}`);
    const result = await response.json();
    const audio = result.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.mimeType?.startsWith('audio/'))?.inlineData;
    if (!audio) throw new Error(`${beat}: no audio returned`);
    const pcm = Buffer.from(audio.data, 'base64');
    const rate = Number(audio.mimeType.match(/rate=(\d+)/)?.[1] || 24000);
    if (pcm.length < rate || pcm.length % 2) throw new Error(`${beat}: invalid or empty PCM`);
    let energy = 0;
    for (let i = 0; i < pcm.length; i += 2) energy += pcm.readInt16LE(i) ** 2;
    if (Math.sqrt(energy / (pcm.length / 2)) < 10) throw new Error(`${beat}: silent audio`);
    fs.writeFileSync(destination + '.tmp', wav(pcm, rate));
    fs.renameSync(destination + '.tmp', destination);
    console.log(`${filename}: ${voices[scene.speaker]}, ${(pcm.length / rate / 2).toFixed(1)}s`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
