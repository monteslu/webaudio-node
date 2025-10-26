import { AudioContext } from '../index.js';

console.log('Testing AudioBufferSourceNode Parameters');

async function testLoopParameters() {
	console.log('\n=== Testing loopStart/loopEnd ===');
	const context = new AudioContext();

	// Create a buffer with a simple ramp (makes it easy to hear loop points)
	const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate); // 1 second
	const channelData = buffer.getChannelData(0);

	// Fill with a frequency sweep (chirp)
	for (let i = 0; i < channelData.length; i++) {
		const t = i / context.sampleRate;
		const freq = 200 + (t * 600); // 200Hz to 800Hz over 1 second
		channelData[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;
	}

	const source = context.createBufferSource();
	source.buffer = buffer;
	source.loop = true;
	source.loopStart = 0.25; // Start loop at 0.25 seconds
	source.loopEnd = 0.75;   // End loop at 0.75 seconds

	source.connect(context.destination);

	await context.resume();

	console.log('Playing 1s buffer with loop between 0.25s - 0.75s for 3 seconds...');
	console.log('(You should hear: initial section, then middle section looping)');

	source.start();

	await new Promise(resolve => setTimeout(resolve, 3000));

	source.stop();
	await context.close();
	console.log('Loop parameters test complete');
}

async function testDetuneParameter() {
	console.log('\n=== Testing detune parameter ===');
	const context = new AudioContext();

	// Create a short buffer with a pure tone
	const buffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
	const channelData = buffer.getChannelData(0);

	// Fill with 440Hz sine wave
	for (let i = 0; i < channelData.length; i++) {
		const t = i / context.sampleRate;
		channelData[i] = Math.sin(2 * Math.PI * 440 * t) * 0.3;
	}

	const source = context.createBufferSource();
	source.buffer = buffer;
	source.loop = true;

	// Detune by +700 cents (7 semitones = perfect 5th)
	// 440Hz + 700 cents ≈ 659Hz (E5)
	source.detune.value = 700;

	source.connect(context.destination);

	await context.resume();

	console.log('Playing 440Hz buffer with +700 cents detune for 2 seconds...');
	console.log('(Should sound like ~659Hz, a perfect 5th above A440)');

	source.start();

	await new Promise(resolve => setTimeout(resolve, 2000));

	source.stop();
	await context.close();
	console.log('Detune parameter test complete');
}

async function testDetuneModulation() {
	console.log('\n=== Testing detune modulation with LFO ===');
	const context = new AudioContext();

	// Create a buffer with a pure tone
	const buffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
	const channelData = buffer.getChannelData(0);

	for (let i = 0; i < channelData.length; i++) {
		const t = i / context.sampleRate;
		channelData[i] = Math.sin(2 * Math.PI * 440 * t) * 0.3;
	}

	const source = context.createBufferSource();
	source.buffer = buffer;
	source.loop = true;

	// Create LFO to modulate detune
	const lfo = context.createOscillator();
	lfo.frequency.value = 3; // 3 Hz

	const lfoDepth = context.createGain();
	lfoDepth.gain.value = 50; // ±50 cents vibrato

	// Connect LFO to detune parameter
	lfo.connect(lfoDepth);
	lfoDepth.connect(source.detune);

	source.connect(context.destination);

	await context.resume();

	console.log('Playing 440Hz buffer with LFO-modulated detune for 3 seconds...');
	console.log('(You should hear vibrato from pitch modulation)');

	source.start();
	lfo.start();

	await new Promise(resolve => setTimeout(resolve, 3000));

	source.stop();
	lfo.stop();
	await context.close();
	console.log('Detune modulation test complete');
}

async function runTests() {
	try {
		await testLoopParameters();
		await new Promise(resolve => setTimeout(resolve, 500));

		await testDetuneParameter();
		await new Promise(resolve => setTimeout(resolve, 500));

		await testDetuneModulation();

		console.log('\n✅ All AudioBufferSourceNode parameter tests completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error);
		console.error(error.stack);
		process.exit(1);
	}
}

runTests();
