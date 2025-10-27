import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

const sampleRate = 48000;
const duration = 1.0;
const channelCount = 8;
const length = Math.floor(sampleRate * duration);

console.log('Testing 8-channel rendering performance...\n');

// Test Rust
const rustTimes = [];
for (let i = 0; i < 10; i++) {
	const ctx = new RustContext({
		numberOfChannels: channelCount,
		length: length,
		sampleRate: sampleRate
	});

	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.value = 440;

	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 2000;
	filter.Q.value = 1.0;

	const gain = ctx.createGain();
	gain.gain.value = 0.5;

	osc.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);

	osc.start(0);

	const start = performance.now();
	await ctx.startRendering();
	const elapsed = performance.now() - start;

	rustTimes.push(elapsed);
}

const rustAvg = rustTimes.reduce((a, b) => a + b) / rustTimes.length;
console.log(`Rust (node-web-audio-api):  ${rustAvg.toFixed(2)}ms`);

// Test C++
const cppTimes = [];
for (let i = 0; i < 10; i++) {
	const ctx = new CppContext({
		numberOfChannels: channelCount,
		length: length,
		sampleRate: sampleRate
	});

	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.value = 440;

	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 2000;
	filter.Q.value = 1.0;

	const gain = ctx.createGain();
	gain.gain.value = 0.5;

	osc.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);

	osc.start(0);

	const start = performance.now();
	await ctx.startRendering();
	const elapsed = performance.now() - start;

	cppTimes.push(elapsed);
}

const cppAvg = cppTimes.reduce((a, b) => a + b) / cppTimes.length;
console.log(`C++ (webaudio-node):         ${cppAvg.toFixed(2)}ms`);

const diff = ((cppAvg / rustAvg - 1) * 100).toFixed(1);
if (cppAvg < rustAvg) {
	console.log(`\n✅ WIN: ${diff}% faster`);
} else {
	console.log(`\n❌ LOSS: ${diff}% slower`);
}
