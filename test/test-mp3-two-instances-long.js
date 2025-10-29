import { createWebAudioInstance } from '../src/factory.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 Testing 5 MP3 instances, 1 second apart, playing for 10 seconds...\n');

const instance = await createWebAudioInstance();
const { AudioContext } = instance;

const context = new AudioContext({ sampleRate: 48000, latencyHint: 'playback' });
const audioFilePath = join(__dirname, 'benchmarks', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('Decoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);
console.log(`Duration: ${buffer.duration.toFixed(2)} seconds\n`);

// Use high volume
const masterGain = context.createGain();
masterGain.gain.value = 0.8; // 80% volume
masterGain.connect(context.destination);

// Create 5 instances
const sources = [];
for (let i = 0; i < 5; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain);
    sources.push(source);
}

console.log('Setup:');
console.log('  Instance 1: starts at 0s');
console.log('  Instance 2: starts at 1s');
console.log('  Instance 3: starts at 2s');
console.log('  Instance 4: starts at 3s');
console.log('  Instance 5: starts at 4s');
console.log('  Playing for 10 seconds total\n');

console.log('What you should hear:');
console.log('  t=0-1s: ONE instance (quietest)');
console.log('  t=1-2s: TWO instances (louder)');
console.log('  t=2-3s: THREE instances (even louder)');
console.log('  t=3-4s: FOUR instances (louder still)');
console.log('  t=4-10s: FIVE instances (LOUDEST/fullest)\n');

await context.resume();

// Start each source 1 second apart
for (let i = 0; i < 5; i++) {
    sources[i].start(context.currentTime + i);
}

console.log('Playing now... LISTEN FOR PROGRESSIVE VOLUME INCREASES!\n');

await new Promise(resolve => setTimeout(resolve, 10000));

// Stop all sources
for (let i = 0; i < 5; i++) {
    sources[i].stop();
}
await context.close();

console.log('\n✅ Test complete!');
console.log('Did you hear progressive volume increases at t=1s, 2s, 3s, and 4s?\n');
