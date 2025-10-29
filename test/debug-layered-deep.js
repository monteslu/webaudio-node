import { createWebAudioInstance } from '../src/factory.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🔍 DEEP DEBUG: Checking buffer source scheduling...\n');

const instance = await createWebAudioInstance();
const { AudioContext } = instance;

const context = new AudioContext({ sampleRate: 48000, latencyHint: 'playback' });
const audioFilePath = join(__dirname, 'benchmarks', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('Decoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);
console.log(`Buffer: ${buffer.duration.toFixed(2)}s, ${buffer.sampleRate}Hz, ${buffer.numberOfChannels}ch\n`);

// Create master gain
const masterGain = context.createGain();
masterGain.gain.value = 0.25;
masterGain.connect(context.destination);

// Create 5 buffer sources
const sources = [];
const numInstances = 5;

console.log('Creating sources:');
for (let i = 0; i < numInstances; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    const instanceGain = context.createGain();
    instanceGain.gain.value = 1.0;

    source.connect(instanceGain);
    instanceGain.connect(masterGain);

    console.log(`  Source ${i + 1}: nodeId=${source._nodeId}, buffer=${source.buffer ? 'SET' : 'NULL'}`);
    sources.push({ source, instanceGain });
}

console.log('\nStarting playback:');
await context.resume();
console.log(`currentTime after resume: ${context.currentTime}`);

// Start each source
console.log('\nScheduling sources:');
for (let i = 0; i < numInstances; i++) {
    const startTime = context.currentTime + i;
    console.log(`  Source ${i + 1} (nodeId=${sources[i].source._nodeId}): start(${startTime.toFixed(6)})`);
    sources[i].source.start(startTime);
}

// Check timing during playback
console.log('\nMonitoring timing:');
for (let t = 0; t < 6; t++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`  t=${t + 1}s: currentTime=${context.currentTime.toFixed(3)}`);
}

console.log('\nStopping...');
for (let i = 0; i < numInstances; i++) {
    sources[i].source.stop();
}

await context.close();
console.log('✅ Deep debug complete!\n');
