import { createWebAudioInstance } from '../src/factory.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🔍 DEBUG: Checking timing for layered MP3...\n');
console.log('Creating fresh WASM instance...');

const instance = await createWebAudioInstance();
const { AudioContext } = instance;

const context = new AudioContext({ sampleRate: 48000, latencyHint: 'playback' });
const audioFilePath = join(__dirname, 'benchmarks', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('Decoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);

console.log(`Duration: ${buffer.duration.toFixed(2)} seconds`);
console.log(`Sample rate: ${buffer.sampleRate} Hz`);
console.log(`Channels: ${buffer.numberOfChannels}\n`);

// Create master gain to prevent clipping (5 sources = reduce volume)
const masterGain = context.createGain();
masterGain.gain.value = 0.25;
masterGain.connect(context.destination);

// Create 5 buffer sources
const sources = [];
const numInstances = 5;

for (let i = 0; i < numInstances; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    const instanceGain = context.createGain();
    instanceGain.gain.value = 1.0;

    source.connect(instanceGain);
    instanceGain.connect(masterGain);

    sources.push({ source, instanceGain });
}

console.log('DEBUG: currentTime BEFORE resume:', context.currentTime);
console.log('Starting playback with 1-second intervals:');
await context.resume();

console.log('DEBUG: currentTime AFTER resume:', context.currentTime);

// Start each source with 1 second delay
for (let i = 0; i < numInstances; i++) {
    const currentTime = context.currentTime;
    const startTime = currentTime + i;
    sources[i].source.start(startTime);
    console.log(
        `  Instance ${i + 1}: currentTime=${currentTime.toFixed(6)}, scheduled at ${startTime.toFixed(6)}`
    );
}

console.log(`\nDEBUG: currentTime after scheduling: ${context.currentTime}`);
console.log(`Playing for 10 seconds (WASM real-time)...\n`);

await new Promise(resolve => setTimeout(resolve, 10000));

// Stop all sources
for (let i = 0; i < numInstances; i++) {
    sources[i].source.stop();
}

await context.close();

console.log('\n✅ Debug test complete!\n');
