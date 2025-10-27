import { OfflineAudioContext } from './src/javascript/index.js';
import { readFileSync, writeFileSync } from 'fs';

console.log('\n🧪 Testing NATIVE C++ MP3 decoding and offline rendering...\n');

// Decode MP3
const mp3Data = readFileSync('test/samples/rising_sun.mp3');

// Create offline context for 5 seconds at 48kHz
const ctx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: 48000 * 5, // 5 seconds
    sampleRate: 48000
});

console.log('Decoding MP3...');
const buffer = await ctx.decodeAudioData(mp3Data.buffer);
console.log('✅ Decoded:', buffer.duration.toFixed(2), 'seconds');
console.log('   Channels:', buffer.numberOfChannels);
console.log('   Sample rate:', buffer.sampleRate);

// Create buffer source
const source = ctx.createBufferSource();
source.buffer = buffer;
source.connect(ctx.destination);
source.start(0);

console.log('\nRendering 5 seconds of audio with NATIVE C++...');
const start = performance.now();
const rendered = await ctx.startRendering();
const elapsed = performance.now() - start;

console.log('✅ Rendered in', elapsed.toFixed(2), 'ms');

// Check for audio
const ch0 = rendered.getChannelData(0);
let max = 0;
let nonZero = 0;
for (let i = 0; i < ch0.length; i++) {
    const abs = Math.abs(ch0[i]);
    if (abs > 0.0001) nonZero++;
    max = Math.max(max, abs);
}

console.log('\n📊 Audio Analysis:');
console.log('   Max amplitude:', max.toFixed(6));
console.log('   Non-zero samples:', nonZero, '/', ch0.length);
console.log('   Percentage:', ((nonZero / ch0.length) * 100).toFixed(2), '%');

// Write WAV file
function writeWav(filename, buffer) {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = 48000;
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
    console.log('\n✅ Wrote', filename);
}

writeWav('/tmp/native-mp3-output.wav', rendered);

console.log('\n' + (max > 0.01 ? '✅ NATIVE MP3 DECODING WORKS!' : '❌ NO AUDIO RENDERED'));
console.log('\nPlay with: afplay /tmp/native-mp3-output.wav');
