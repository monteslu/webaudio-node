import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

const sampleRate = 48000;
const duration = 1.0;
const length = sampleRate * duration;

console.log('Testing Analyser Process() only (no FFT calls)...\\n');

// Test Rust
const rustTimes = [];
for (let i = 0; i < 10; i++) {
	const ctx = new RustContext({
		numberOfChannels: 2,
		length: length,
		sampleRate: sampleRate
	});

	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.value = 440;

	const analyser = ctx.createAnalyser();
	analyser.fftSize = 2048;

	osc.connect(analyser);
	analyser.connect(ctx.destination);
	osc.start(0);

	const start = performance.now();
	await ctx.startRendering();
	// NO FFT CALLS - just Process() overhead
	const elapsed = performance.now() - start;
	rustTimes.push(elapsed);
}

const rustAvg = rustTimes.reduce((a, b) => a + b) / rustTimes.length;
console.log(`Rust Process() only:  ${rustAvg.toFixed(2)}ms`);

// Test C++
const cppTimes = [];
for (let i = 0; i < 10; i++) {
	const ctx = new CppContext({
		numberOfChannels: 2,
		length: length,
		sampleRate: sampleRate
	});

	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.value = 440;

	const analyser = ctx.createAnalyser();
	analyser.fftSize = 2048;

	osc.connect(analyser);
	analyser.connect(ctx.destination);
	osc.start(0);

	const start = performance.now();
	await ctx.startRendering();
	// NO FFT CALLS - just Process() overhead
	const elapsed = performance.now() - start;
	cppTimes.push(elapsed);
}

const cppAvg = cppTimes.reduce((a, b) => a + b) / cppTimes.length;
console.log(`C++ Process() only:   ${cppAvg.toFixed(2)}ms`);

const diff = ((cppAvg / rustAvg - 1) * 100).toFixed(1);
if (cppAvg < rustAvg) {
	console.log(`\\n✅ WIN: ${(-diff)}% faster`);
} else {
	console.log(`\\n❌ LOSS: ${diff}% slower`);
}
