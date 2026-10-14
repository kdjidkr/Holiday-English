// Original, quiet ambient loop: warm pads and sparse bell notes, no speech.
const fs = require('node:fs');
const path = require('node:path');
const rate = 22050, duration = 32, frames = rate * duration;
const samples = new Float64Array(frames);
const chords = [[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,55]];
function note(midi, start, length, gain, bell = false) {
  const hz = 440 * 2 ** ((midi - 69) / 12);
  const count = Math.floor(length * rate);
  for (let n = 0; n < count; n++) {
    const t = n / rate;
    const envelope = bell ? (1 - Math.exp(-t * 25)) * Math.exp(-t * 1.1) * Math.min(1,(length-t)/.5)
      : Math.sin(Math.PI * t / length) ** 2;
    const tone = Math.sin(2 * Math.PI * hz * t) + .18 * Math.sin(2 * Math.PI * hz * 2 * t)
      + .10 * Math.sin(2 * Math.PI * hz * 1.002 * t);
    samples[(Math.floor(start * rate) + n) % frames] += tone * envelope * gain;
  }
}
chords.forEach((chord, i) => chord.forEach(midi => note(midi, i * 8 - 2 + duration, 12, .045)));
[72,76,71,67,69,72,64,67].forEach((midi,i)=>note(midi, i * 4 + 1, 5, .035, true));
const pcm = Buffer.alloc(frames * 2);
for(let i=0;i<frames;i++) pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i])) * 32767),i*2);
const header=Buffer.alloc(44);
header.write('RIFF'); header.writeUInt32LE(36+pcm.length,4); header.write('WAVEfmt ',8);
header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(1,22);
header.writeUInt32LE(rate,24); header.writeUInt32LE(rate*2,28); header.writeUInt16LE(2,32); header.writeUInt16LE(16,34);
header.write('data',36); header.writeUInt32LE(pcm.length,40);
const destination=path.resolve(__dirname,'../assets/arrival/quiet-morning.wav');
fs.writeFileSync(destination,Buffer.concat([header,pcm]));
console.log('Generated original 32-second quiet morning loop.');
