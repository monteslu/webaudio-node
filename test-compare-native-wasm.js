import { OfflineAudioContext as NativeContext } from './src/javascript/index.js';
import { OfflineAudioContext as WasmContext } from './index-wasm.js';
import fs from 'fs';

// Helper to create WAV file
function writeWavFile(filename, buffer, sampleRate) {
	const numChannels = buffer.numberOfChannels;
	const length = buffer.length;

	// WAV header
	const header = Buffer.alloc(44);
	const dataSize = length * numChannels * 2; // 16-bit samples

	header.write('RIFF', 0);
	header.writeUInt32LE(36 + dataSize, 4);
	header.write('WAVE', 8);
	header.write('fmt ', 12);
	header.writeUInt32LE(16, 16); // fmt chunk size
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(numChannels, 22);
	header.writeUInt32LE(sampleRate, 24);
	header.writeUInt32LE(sampleRate * numChannels * 2, 28); // byte rate
	header.writeUInt16LE(numChannels * 2, 32); // block align
	header.writeUInt16LE(16, 34); // bits per sample
	header.write('data', 36);
	header.writeUInt32LE(dataSize, 40);

	// Convert float samples to 16-bit PCM
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
	console.log('✅ Wrote', filename);
}

console.log('\n🔬 Comparing Native C++ vs WASM...\n');

// Test configuration
const config = {
	numberOfChannels: 2,
	length: 48000 * 3, // 3 seconds
	sampleRate: 48000
};

// Test 1: Simple oscillator
console.log('Test 1: Simple 440Hz sine wave');
{
	console.log('  Native C++...');
	const ctx = new NativeContext(config);
	const osc = ctx.createOscillator();
	osc.frequency.value = 440;
	osc.connect(ctx.destination);
	osc.start(0);

	const start = performance.now();
	const buffer = await ctx.startRendering();
	const elapsed = performance.now() - start;
	console.log('    ✓ Rendered in', elapsed.toFixed(2), 'ms');

	const ch0 = buffer.getChannelData(0);
	let max = 0;
	for (let i = 0; i < ch0.length; i++) {
		max = Math.max(max, Math.abs(ch0[i]));
	}
	console.log('    Max amplitude:', max.toFixed(4));

	writeWavFile('/tmp/native-simple.wav', buffer, config.sampleRate);
}

{
	console.log('  WASM...');
	const ctx = new WasmContext(config);
	const osc = ctx.createOscillator();
	osc.frequency.value = 440;
	osc.connect(ctx.destination);
	osc.start(0);

	const start = performance.now();
	const buffer = await ctx.startRendering();
	const elapsed = performance.now() - start;
	console.log('    ✓ Rendered in', elapsed.toFixed(2), 'ms');

	const ch0 = buffer.getChannelData(0);
	let max = 0;
	for (let i = 0; i < ch0.length; i++) {
		max = Math.max(max, Math.abs(ch0[i]));
	}
	console.log('    Max amplitude:', max.toFixed(4));

	writeWavFile('/tmp/wasm-simple.wav', buffer, config.sampleRate);
}

// Test 2: Filtered sawtooth
console.log('\nTest 2: Filtered sawtooth (440Hz lowpass 2kHz)');
{
	console.log('  Native C++...');
	const ctx = new NativeContext(config);
	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.value = 440;

	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 2000;

	const gain = ctx.createGain();
	gain.gain.value = 0.3;

	osc.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);
	osc.start(0);

	const start = performance.now();
	const buffer = await ctx.startRendering();
	const elapsed = performance.now() - start;
	console.log('    ✓ Rendered in', elapsed.toFixed(2), 'ms');

	const ch0 = buffer.getChannelData(0);
	let max = 0;
	for (let i = 0; i < ch0.length; i++) {
		max = Math.max(max, Math.abs(ch0[i]));
	}
	console.log('    Max amplitude:', max.toFixed(4));

	writeWavFile('/tmp/native-filter.wav', buffer, config.sampleRate);
}

{
	console.log('  WASM...');
	const ctx = new WasmContext(config);
	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.value = 440;

	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 2000;

	const gain = ctx.createGain();
	gain.gain.value = 0.3;

	osc.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);
	osc.start(0);

	const start = performance.now();
	const buffer = await ctx.startRendering();
	const elapsed = performance.now() - start;
	console.log('    ✓ Rendered in', elapsed.toFixed(2), 'ms');

	const ch0 = buffer.getChannelData(0);
	let max = 0;
	for (let i = 0; i < ch0.length; i++) {
		max = Math.max(max, Math.abs(ch0[i]));
	}
	console.log('    Max amplitude:', max.toFixed(4));

	writeWavFile('/tmp/wasm-filter.wav', buffer, config.sampleRate);
}

console.log('\n✅ Tests complete!');
console.log('\nGenerated WAV files:');
console.log('  /tmp/native-simple.wav');
console.log('  /tmp/wasm-simple.wav');
console.log('  /tmp/native-filter.wav');
console.log('  /tmp/wasm-filter.wav');
console.log('\nListen to verify they sound the same!');
