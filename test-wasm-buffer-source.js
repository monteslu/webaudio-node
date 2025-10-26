import { OfflineAudioContext } from './index-wasm.js';
import fs from 'fs';

console.log('\n🧪 Testing WASM offline rendering with buffer source...\n');

const offlineCtx = new OfflineAudioContext({
	numberOfChannels: 2,
	length: 48000,
	sampleRate: 48000
});

// Create a simple buffer with a sine wave
console.log('1. Creating audio buffer manually...');
const buffer = offlineCtx.createBuffer(2, 48000, 48000);
const channelData = buffer.getChannelData(0);
for (let i = 0; i < channelData.length; i++) {
	channelData[i] = Math.sin(2 * Math.PI * 440 * i / 48000) * 0.5;
}
// Copy to second channel
buffer.copyToChannel(channelData, 1);

console.log('   First 5 samples:', channelData.slice(0, 5));

// Play it back through offline context
console.log('\n2. Creating buffer source...');
const source = offlineCtx.createBufferSource();
source.buffer = buffer;

const gain = offlineCtx.createGain();
gain.gain.value = 1.0;

source.connect(gain);
gain.connect(offlineCtx.destination);

source.start(0);

console.log('3. Rendering...');
const start = performance.now();
const rendered = await offlineCtx.startRendering();
const elapsed = performance.now() - start;

console.log('   ✅ Complete in', elapsed.toFixed(2), 'ms');

// Check output
const outData = rendered.getChannelData(0);
console.log('\nFirst 10 output samples:', outData.slice(0, 10));

let max = 0;
for (let i = 0; i < outData.length; i++) {
	max = Math.max(max, Math.abs(outData[i]));
}

console.log('Max amplitude:', max);
console.log('\n' + (max > 0.0001 ? '✅ HAS AUDIO' : '❌ SILENT!'));

// Write to WAV
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

	fs.writeFileSync(filename, Buffer.concat([header, data]));
	console.log('\n✅ Wrote', filename);
}

writeWav('/tmp/wasm-buffer-source.wav', rendered);
console.log('\nPlay with: afplay /tmp/wasm-buffer-source.wav');
