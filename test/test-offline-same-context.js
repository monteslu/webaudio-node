import { AudioContext, OfflineAudioContext } from './src/javascript/index.js';
import { readFileSync } from 'fs';

console.log('\n🧪 Testing MP3 decode + process in SAME offline context...\n');

// Use OfflineAudioContext for BOTH decode and processing
const mp3Data = readFileSync('test/samples/rising_sun.mp3');

// First, decode using a regular AudioContext (since OfflineAudioContext doesn't have decodeAudioData)
const tempCtx = new AudioContext({ sampleRate: 48000 });
await tempCtx.resume();
const decodedBuffer = await tempCtx.decodeAudioData(mp3Data.buffer);
await tempCtx.close();

console.log('Decoded:', decodedBuffer.duration.toFixed(2), 'seconds');

// Now create an offline context using the SAME buffer object
const offlineCtx = new OfflineAudioContext({
    numberOfChannels: decodedBuffer.numberOfChannels,
    length: Math.min(decodedBuffer.length, 48000), // Just render 1 second
    sampleRate: decodedBuffer.sampleRate
});

// Create a new buffer in the offline context and copy data
console.log('\nCreating new buffer in offline context and copying data...');
const newBuffer = offlineCtx.createBuffer(
    decodedBuffer.numberOfChannels,
    Math.min(decodedBuffer.length, 48000),
    decodedBuffer.sampleRate
);

// Copy channel data
for (let ch = 0; ch < decodedBuffer.numberOfChannels; ch++) {
    const srcData = decodedBuffer.getChannelData(ch);
    const dstData = newBuffer.getChannelData(ch);
    for (let i = 0; i < newBuffer.length; i++) {
        dstData[i] = srcData[i];
    }
}

// Need to update internal buffer
newBuffer._updateInternalBuffer();

console.log('Buffer copied. Creating source...');

const source = offlineCtx.createBufferSource();
source.buffer = newBuffer;
source.connect(offlineCtx.destination);
source.start(0);

console.log('Rendering...');
const rendered = await offlineCtx.startRendering();

const outData = rendered.getChannelData(0);
let max = 0;
for (let i = 0; i < outData.length; i++) {
    max = Math.max(max, Math.abs(outData[i]));
}

console.log('\nMax amplitude:', max);
console.log(max > 0.0001 ? '✅ HAS AUDIO' : '❌ SILENT!');
