import { OfflineAudioContext as WasmOfflineContext } from './index-wasm.js';
import { readFileSync, writeFileSync } from 'fs';

console.log('\n🧪 Testing WASM buffer source through filters in offline context...\n');

// Decode MP3 with WASM offline context
const decodeCtx = new WasmOfflineContext({
	numberOfChannels: 2,
	length: 48000,
	sampleRate: 48000
});

const mp3Data = readFileSync('test/samples/rising_sun.mp3');
const audioBuffer = await decodeCtx.decodeAudioData(mp3Data.buffer);

console.log('Decoded:', audioBuffer.duration.toFixed(2), 'seconds');

// Create offline context - just process 3 seconds
const length = 48000 * 3;

// Copy first 3 seconds of decoded buffer
function copyBufferSegment(sourceBuffer, startSample, lengthSamples) {
	const ctx = new WasmOfflineContext({
		numberOfChannels: 2,
		length: lengthSamples,
		sampleRate: 48000
	});
	const buffer = ctx.createBuffer(2, lengthSamples, 48000);
	for (let ch = 0; ch < 2; ch++) {
		const srcData = sourceBuffer.getChannelData(ch);
		const dstData = buffer.getChannelData(ch);
		for (let i = 0; i < lengthSamples; i++) {
			dstData[i] = srcData[i + startSample];
		}
	}
	return buffer;
}

const offlineBuffer = copyBufferSegment(audioBuffer, 0, length);
console.log('Copied 3 seconds to offline buffer');

// Helper to write WAV file
function writeWav(filename, buffer) {
	const numChannels = buffer.numberOfChannels;
	const bufferLength = buffer.length;
	const sampleRate = 48000;
	const header = Buffer.alloc(44);
	const dataSize = bufferLength * numChannels * 2;

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
	for (let i = 0; i < bufferLength; i++) {
		for (let ch = 0; ch < numChannels; ch++) {
			const sample = buffer.getChannelData(ch)[i];
			const pcm = Math.max(-1, Math.min(1, sample)) * 32767;
			data.writeInt16LE(pcm, offset);
			offset += 2;
		}
	}

	writeFileSync(filename, Buffer.concat([header, data]));
}

// Test 1: Just buffer source -> destination
console.log('\n--- Test 1: WASM Buffer source -> destination ---');
const offlineCtx1 = new WasmOfflineContext({ numberOfChannels: 2, length, sampleRate: 48000 });
const buffer1 = offlineCtx1.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer1.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source1 = offlineCtx1.createBufferSource();
source1.buffer = buffer1;
source1.connect(offlineCtx1.destination);
source1.start(0);

const start1 = performance.now();
const rendered1 = await offlineCtx1.startRendering();
const time1 = performance.now() - start1;

let max1 = 0;
for (let i = 0; i < rendered1.getChannelData(0).length; i++) {
	max1 = Math.max(max1, Math.abs(rendered1.getChannelData(0)[i]));
}
console.log('Max amplitude:', max1.toFixed(6), max1 > 0.0001 ? '✅' : '❌');
console.log('Render time:', time1.toFixed(2), 'ms');
writeWav('/tmp/wasm-test1-direct.wav', rendered1);
console.log('Wrote /tmp/wasm-test1-direct.wav');

// Test 2: Buffer source -> lowpass filter -> destination
console.log('\n--- Test 2: WASM Buffer source -> lowpass (2kHz) -> destination ---');
const offlineCtx2 = new WasmOfflineContext({ numberOfChannels: 2, length, sampleRate: 48000 });
const buffer2 = offlineCtx2.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer2.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source2 = offlineCtx2.createBufferSource();
source2.buffer = buffer2;
const filter2 = offlineCtx2.createBiquadFilter();
filter2.type = 'lowpass';
filter2.frequency.value = 2000;
source2.connect(filter2);
filter2.connect(offlineCtx2.destination);
source2.start(0);

const start2 = performance.now();
const rendered2 = await offlineCtx2.startRendering();
const time2 = performance.now() - start2;

let max2 = 0;
for (let i = 0; i < rendered2.getChannelData(0).length; i++) {
	max2 = Math.max(max2, Math.abs(rendered2.getChannelData(0)[i]));
}
console.log('Max amplitude:', max2.toFixed(6), max2 > 0.0001 ? '✅' : '❌');
console.log('Render time:', time2.toFixed(2), 'ms');
writeWav('/tmp/wasm-test2-lowpass.wav', rendered2);
console.log('Wrote /tmp/wasm-test2-lowpass.wav');

// Test 3: Buffer source -> highpass filter -> destination
console.log('\n--- Test 3: WASM Buffer source -> highpass (300Hz) -> destination ---');
const offlineCtx3 = new WasmOfflineContext({ numberOfChannels: 2, length, sampleRate: 48000 });
const buffer3 = offlineCtx3.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer3.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source3 = offlineCtx3.createBufferSource();
source3.buffer = buffer3;
const filter3 = offlineCtx3.createBiquadFilter();
filter3.type = 'highpass';
filter3.frequency.value = 300;
source3.connect(filter3);
filter3.connect(offlineCtx3.destination);
source3.start(0);

const start3 = performance.now();
const rendered3 = await offlineCtx3.startRendering();
const time3 = performance.now() - start3;

let max3 = 0;
for (let i = 0; i < rendered3.getChannelData(0).length; i++) {
	max3 = Math.max(max3, Math.abs(rendered3.getChannelData(0)[i]));
}
console.log('Max amplitude:', max3.toFixed(6), max3 > 0.0001 ? '✅' : '❌');
console.log('Render time:', time3.toFixed(2), 'ms');
writeWav('/tmp/wasm-test3-highpass.wav', rendered3);
console.log('Wrote /tmp/wasm-test3-highpass.wav');

// Test 4: 3 layered sources with different filters
console.log('\n--- Test 4: WASM LAYERED - 3 sources with filters mixed ---');
const offlineCtx4 = new WasmOfflineContext({ numberOfChannels: 2, length, sampleRate: 48000 });

// Layer 1: Direct (full range)
const buffer4a = offlineCtx4.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer4a.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source4a = offlineCtx4.createBufferSource();
source4a.buffer = buffer4a;
const gain4a = offlineCtx4.createGain();
gain4a.gain.value = 0.3;
source4a.connect(gain4a);
gain4a.connect(offlineCtx4.destination);

// Layer 2: Lowpass at 1kHz
const buffer4b = offlineCtx4.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer4b.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source4b = offlineCtx4.createBufferSource();
source4b.buffer = buffer4b;
const filter4b = offlineCtx4.createBiquadFilter();
filter4b.type = 'lowpass';
filter4b.frequency.value = 1000;
const gain4b = offlineCtx4.createGain();
gain4b.gain.value = 0.4;
source4b.connect(filter4b);
filter4b.connect(gain4b);
gain4b.connect(offlineCtx4.destination);

// Layer 3: Highpass at 2kHz
const buffer4c = offlineCtx4.createBuffer(2, length, 48000);
for (let ch = 0; ch < 2; ch++) {
	buffer4c.copyToChannel(offlineBuffer.getChannelData(ch), ch);
}
const source4c = offlineCtx4.createBufferSource();
source4c.buffer = buffer4c;
const filter4c = offlineCtx4.createBiquadFilter();
filter4c.type = 'highpass';
filter4c.frequency.value = 2000;
const gain4c = offlineCtx4.createGain();
gain4c.gain.value = 0.3;
source4c.connect(filter4c);
filter4c.connect(gain4c);
gain4c.connect(offlineCtx4.destination);

source4a.start(0);
source4b.start(0);
source4c.start(0);

const start4 = performance.now();
const rendered4 = await offlineCtx4.startRendering();
const time4 = performance.now() - start4;

let max4 = 0;
for (let i = 0; i < rendered4.getChannelData(0).length; i++) {
	max4 = Math.max(max4, Math.abs(rendered4.getChannelData(0)[i]));
}
console.log('Max amplitude:', max4.toFixed(6), max4 > 0.0001 ? '✅' : '❌');
console.log('Render time:', time4.toFixed(2), 'ms');
writeWav('/tmp/wasm-test4-layered.wav', rendered4);
console.log('Wrote /tmp/wasm-test4-layered.wav');

console.log('\n✅ All WASM tests complete!');
console.log('\nGenerated files:');
console.log('  /tmp/wasm-test1-direct.wav     - Direct playback');
console.log('  /tmp/wasm-test2-lowpass.wav    - Lowpass filtered (2kHz)');
console.log('  /tmp/wasm-test3-highpass.wav   - Highpass filtered (300Hz)');
console.log('  /tmp/wasm-test4-layered.wav    - 3 layers with different filters');
console.log('\nPlay the layered version with:');
console.log('  afplay /tmp/wasm-test4-layered.wav');
