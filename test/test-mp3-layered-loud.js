import { createWebAudioInstance } from '../src/factory.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 Testing MP3 layering with LOUDER volume...\n');

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

// Try with HIGHER volume to make layering more obvious
const masterGain = context.createGain();
masterGain.gain.value = 0.6; // 60% volume (higher than before)
masterGain.connect(context.destination);

// Create just 3 instances to make it clearer
const sources = [];
const numInstances = 3;

console.log('Creating 3 instances (easier to hear than 5):');
for (let i = 0; i < numInstances; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    const instanceGain = context.createGain();
    instanceGain.gain.value = 1.0;

    source.connect(instanceGain);
    instanceGain.connect(masterGain);
    sources.push({ source, instanceGain });
    console.log(`  Instance ${i + 1}`);
}

console.log('\nStarting playback:');
console.log('  Instance 1 starts at 0s');
console.log('  Instance 2 starts at 1s (should hear it JOIN)');
console.log('  Instance 3 starts at 2s (should hear it JOIN again)\n');

await context.resume();

// Start each source 1 second apart
for (let i = 0; i < numInstances; i++) {
    const startTime = context.currentTime + i;
    sources[i].source.start(startTime);
}

console.log('Playing for 8 seconds...');
console.log('Listen carefully - the sound should get FULLER/LOUDER as each instance joins!\n');

await new Promise(resolve => setTimeout(resolve, 8000));

// Stop all sources
for (let i = 0; i < numInstances; i++) {
    sources[i].source.stop();
}

await context.close();

console.log('✅ Test complete!');
console.log('Did the sound get fuller/louder at t=1s and t=2s?\n');
