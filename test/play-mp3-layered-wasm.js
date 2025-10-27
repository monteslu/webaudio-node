import { OfflineAudioContext } from '../index-wasm.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 WASM: Playing 5 layered instances of rising_sun.mp3...\n');

// Render 10 seconds offline
const sampleRate = 48000;
const duration = 10; // seconds
const context = new OfflineAudioContext({
    numberOfChannels: 2,
    length: sampleRate * duration,
    sampleRate: sampleRate
});

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
const numInstances = 5;

console.log('Creating layered sources with 1-second intervals:');
for (let i = 0; i < numInstances; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    // Individual gain for each instance
    const instanceGain = context.createGain();
    instanceGain.gain.value = 1.0;

    source.connect(instanceGain);
    instanceGain.connect(masterGain);

    // Start each source with 1 second delay
    const startTime = i * 1.0;
    source.start(startTime);
    console.log(`  Instance ${i + 1}: starts at ${startTime}s`);
}

console.log(`\nRendering ${duration} seconds of layered audio...\n`);
const renderStart = performance.now();
const rendered = await context.startRendering();
const renderTime = performance.now() - renderStart;

console.log(`✅ Rendered in ${renderTime.toFixed(2)}ms`);

// Check audio levels
const ch0 = rendered.getChannelData(0);
let max = 0;
for (let i = 0; i < ch0.length; i++) {
    max = Math.max(max, Math.abs(ch0[i]));
}
console.log(`Max amplitude: ${max.toFixed(6)}`);

// Write WAV
function writeWav(filename, buffer) {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const header = Buffer.alloc(44);
    const dataSize = length * numChannels * 2;

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * numChannels * 2, 28);
    header.writeUInt16LE(numChannels * 2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    const data = Buffer.alloc(dataSize);
    let offset = 0;
    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = buffer.getChannelData(ch)[i];
            const pcm = Math.max(-1, Math.min(1, sample)) * 32767;
            data.writeInt16LE(pcm, offset);
            offset += 2;
        }
    }

    writeFileSync(filename, Buffer.concat([header, data]));
}

const outputFile = '/tmp/wasm-layered-mp3.wav';
writeWav(outputFile, rendered);

console.log(`\nWrote ${outputFile}`);
console.log('\n✅ WASM layered playback complete!\n');
console.log('Play with: afplay /tmp/wasm-layered-mp3.wav\n');
