import { AudioContext } from '../src/javascript/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 Playing 5 layered instances of rising_sun.mp3...\n');

const context = new AudioContext({ sampleRate: 48000 });
const audioFilePath = join(__dirname, 'samples', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('Decoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);

console.log(`Duration: ${buffer.duration.toFixed(2)} seconds`);
console.log(`Sample rate: ${buffer.sampleRate} Hz`);
console.log(`Channels: ${buffer.numberOfChannels}\n`);

// Create master gain to prevent clipping (5 sources = reduce volume)
const masterGain = context.createGain();
masterGain.gain.value = 0.25; // 25% volume to prevent distortion
masterGain.connect(context.destination);

// Create 5 buffer sources, each starting 1 second apart
const sources = [];
const numInstances = 5;

for (let i = 0; i < numInstances; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // Individual gain for each instance
    const instanceGain = context.createGain();
    instanceGain.gain.value = 1.0;

    source.connect(instanceGain);
    instanceGain.connect(masterGain);

    sources.push({ source, instanceGain });
}

console.log('Starting playback with 1-second intervals:');
await context.resume();

// Start each source with 1 second delay
for (let i = 0; i < numInstances; i++) {
    const startTime = context.currentTime + i;
    sources[i].source.start(startTime);
    console.log(`  Instance ${i + 1}: starts at ${i}s`);
}

// Play for 10 seconds to hear the layering
const playDuration = 10;
console.log(`\nPlaying for ${playDuration} seconds...\n`);

await new Promise(resolve => setTimeout(resolve, playDuration * 1000));

// Stop all sources
for (let i = 0; i < numInstances; i++) {
    sources[i].source.stop();
}

await context.close();

console.log('\n✅ Layered playback complete!\n');
