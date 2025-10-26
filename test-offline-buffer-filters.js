import { AudioContext, OfflineAudioContext } from './src/javascript/index.js';
import { readFileSync } from 'fs';

console.log('\n🧪 Testing buffer source through filters in offline context...\n');

// Decode MP3
const ctx = new AudioContext({ sampleRate: 48000 });
const mp3Data = readFileSync('test/samples/rising_sun.mp3');
await ctx.resume();
const audioBuffer = await ctx.decodeAudioData(mp3Data.buffer);
await ctx.close();

console.log('Decoded:', audioBuffer.duration.toFixed(2), 'seconds');

// Create offline context - just process 1 second
const length = 48000;
const offlineCtx = new OfflineAudioContext({
	numberOfChannels: 2,
	length: length,
	sampleRate: 48000
});

// Copy first second of decoded buffer
const offlineBuffer = offlineCtx.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	const srcData = audioBuffer.getChannelData(ch);
	const dstData = offlineBuffer.getChannelData(ch);
	for (let i = 0; i < length; i++) {
		dstData[i] = srcData[i];
	}
}

console.log('Copied 1 second to offline buffer');
console.log('Max in copied buffer:', Math.max(...offlineBuffer.getChannelData(0).slice(0, 1000)));

// Test 1: Just buffer source -> destination
console.log('\n--- Test 1: Buffer source -> destination ---');
const offlineCtx1 = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: 48000 });
const buffer1 = offlineCtx1.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer1.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source1 = offlineCtx1.createBufferSource();
source1.buffer = buffer1;
source1.connect(offlineCtx1.destination);
source1.start(0);
const rendered1 = await offlineCtx1.startRendering();
const max1 = Math.max(...rendered1.getChannelData(0).slice(0, 1000));
console.log('Max amplitude:', max1, max1 > 0.0001 ? '✅' : '❌');

// Test 2: Buffer source -> gain -> destination
console.log('\n--- Test 2: Buffer source -> gain -> destination ---');
const offlineCtx2 = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: 48000 });
const buffer2 = offlineCtx2.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer2.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source2 = offlineCtx2.createBufferSource();
source2.buffer = buffer2;
const gain2 = offlineCtx2.createGain();
gain2.gain.value = 0.8;
source2.connect(gain2);
gain2.connect(offlineCtx2.destination);
source2.start(0);
const rendered2 = await offlineCtx2.startRendering();
const max2 = Math.max(...rendered2.getChannelData(0).slice(0, 1000));
console.log('Max amplitude:', max2, max2 > 0.0001 ? '✅' : '❌');

// Test 3: Buffer source -> filter -> destination
console.log('\n--- Test 3: Buffer source -> filter -> destination ---');
const offlineCtx3 = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: 48000 });
const buffer3 = offlineCtx3.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer3.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source3 = offlineCtx3.createBufferSource();
source3.buffer = buffer3;
const filter3 = offlineCtx3.createBiquadFilter();
filter3.type = 'lowpass';
filter3.frequency.value = 2000;
source3.connect(filter3);
filter3.connect(offlineCtx3.destination);
source3.start(0);
const rendered3 = await offlineCtx3.startRendering();
const max3 = Math.max(...rendered3.getChannelData(0).slice(0, 1000));
console.log('Max amplitude:', max3, max3 > 0.0001 ? '✅' : '❌');

// Test 4: Buffer source -> compressor -> destination
console.log('\n--- Test 4: Buffer source -> compressor -> destination ---');
const offlineCtx4 = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: 48000 });
const buffer4 = offlineCtx4.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer4.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source4 = offlineCtx4.createBufferSource();
source4.buffer = buffer4;
const compressor4 = offlineCtx4.createDynamicsCompressor();
source4.connect(compressor4);
compressor4.connect(offlineCtx4.destination);
source4.start(0);
const rendered4 = await offlineCtx4.startRendering();
const max4 = Math.max(...rendered4.getChannelData(0).slice(0, 1000));
console.log('Max amplitude:', max4, max4 > 0.0001 ? '✅' : '❌');
