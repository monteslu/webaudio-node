import { AudioContext } from './src/javascript/index.js';
import { readFileSync } from 'fs';

console.log('\n🧪 Testing decoded MP3 playback...\n');

const ctx = new AudioContext({ sampleRate: 48000 });
const mp3Data = readFileSync('test/samples/rising_sun.mp3');

console.log('Decoding...');
await ctx.resume();
const buffer = await ctx.decodeAudioData(mp3Data.buffer);

console.log('Decoded:', buffer.duration.toFixed(2), 'seconds');
console.log('Creating buffer source...');

const source = ctx.createBufferSource();
source.buffer = buffer;
source.connect(ctx.destination);

console.log('Playing for 3 seconds...');
source.start(0);

await new Promise(resolve => setTimeout(resolve, 3000));

await ctx.close();
console.log('\n✅ Done! Did you hear audio?');
