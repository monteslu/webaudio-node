import { AudioContext } from '../src/javascript/index.js';

const context = new AudioContext();

// Helper to create distortion curves
function makeDistortionCurve(amount = 50) {
	const samples = 256;
	const curve = new Float32Array(samples);
	const deg = Math.PI / 180;

	for (let i = 0; i < samples; i++) {
		const x = (i * 2) / samples - 1;
		curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
	}

	return curve;
}

function makeSoftClip() {
	const samples = 256;
	const curve = new Float32Array(samples);

	for (let i = 0; i < samples; i++) {
		const x = (i * 2) / samples - 1;
		// Soft clipping using tanh
		curve[i] = Math.tanh(x * 2);
	}

	return curve;
}

function makeHardClip() {
	const samples = 256;
	const curve = new Float32Array(samples);

	for (let i = 0; i < samples; i++) {
		const x = (i * 2) / samples - 1;
		// Hard clipping
		curve[i] = Math.max(-0.9, Math.min(0.9, x));
	}

	return curve;
}

async function testBasicWaveShaper() {
	console.log('\n=== Testing WaveShaperNode ===\n');

	// Create wave shaper
	const shaper = context.createWaveShaper();
	console.log('✓ Created WaveShaperNode');

	// Test with no curve (pass-through)
	const osc = context.createOscillator();
	osc.frequency.value = 440;
	osc.type = 'sine';

	osc.connect(shaper);
	shaper.connect(context.destination);
	console.log('✓ Connected osc -> shaper -> destination');

	await context.resume();
	osc.start();
	console.log('✓ Started (no curve - should pass through)');

	await new Promise(resolve => setTimeout(resolve, 200));

	// Set distortion curve
	const distortionCurve = makeDistortionCurve(100);
	shaper.curve = distortionCurve;
	console.log(`✓ Set distortion curve (${distortionCurve.length} samples)`);

	await new Promise(resolve => setTimeout(resolve, 200));
	console.log('✓ Playing with distortion');

	// Clear curve
	shaper.curve = null;
	console.log('✓ Cleared curve (back to pass-through)');

	await new Promise(resolve => setTimeout(resolve, 200));

	osc.stop();
	await context.suspend();
	console.log('✓ Stopped');

	console.log('\n=== WaveShaperNode Test Complete ===\n');
}

async function testDifferentCurves() {
	console.log('\n=== Testing Different Waveshaping Curves ===\n');

	const osc = context.createOscillator();
	osc.frequency.value = 200;
	osc.type = 'sine';

	const preGain = context.createGain();
	preGain.gain.value = 0.8;

	const shaper = context.createWaveShaper();
	const postGain = context.createGain();
	postGain.gain.value = 0.5;

	osc.connect(preGain);
	preGain.connect(shaper);
	shaper.connect(postGain);
	postGain.connect(context.destination);

	await context.resume();
	osc.start();

	// Test soft clipping
	console.log('Testing soft clip (tanh)...');
	shaper.curve = makeSoftClip();
	await new Promise(resolve => setTimeout(resolve, 300));
	console.log('✓ Soft clip applied');

	// Test hard clipping
	console.log('Testing hard clip...');
	shaper.curve = makeHardClip();
	await new Promise(resolve => setTimeout(resolve, 300));
	console.log('✓ Hard clip applied');

	// Test mild distortion
	console.log('Testing mild distortion...');
	shaper.curve = makeDistortionCurve(20);
	await new Promise(resolve => setTimeout(resolve, 300));
	console.log('✓ Mild distortion applied');

	// Test heavy distortion
	console.log('Testing heavy distortion...');
	shaper.curve = makeDistortionCurve(200);
	await new Promise(resolve => setTimeout(resolve, 300));
	console.log('✓ Heavy distortion applied');

	osc.stop();
	await context.suspend();
	console.log('✓ Stopped');

	console.log('\n=== Different Curves Test Complete ===\n');
}

async function testOversampleProperty() {
	console.log('\n=== Testing Oversample Property ===\n');

	const shaper = context.createWaveShaper();
	shaper.curve = makeDistortionCurve(150);

	// Test different oversample values
	console.log('Default oversample:', shaper.oversample);

	shaper.oversample = 'none';
	console.log('✓ Set oversample to "none"');

	shaper.oversample = '2x';
	console.log('✓ Set oversample to "2x"');

	shaper.oversample = '4x';
	console.log('✓ Set oversample to "4x"');

	// Note: Actual oversampling not yet implemented in C++,
	// but the property should work

	console.log('\n=== Oversample Property Test Complete ===\n');
}

async function testWaveshapingSynthesis() {
	console.log('\n=== Testing Waveshaping Synthesis ===\n');

	// Use waveshaping to create harmonics from a sine wave
	const osc = context.createOscillator();
	osc.frequency.value = 110; // A2
	osc.type = 'sine';

	const shaper = context.createWaveShaper();

	// Polynomial curve to add harmonics: x^3
	const curve = new Float32Array(256);
	for (let i = 0; i < 256; i++) {
		const x = (i * 2) / 256 - 1;
		curve[i] = x * x * x; // Cubic waveshaping
	}
	shaper.curve = curve;

	const gain = context.createGain();
	gain.gain.value = 0.3;

	osc.connect(shaper);
	shaper.connect(gain);
	gain.connect(context.destination);

	await context.resume();
	osc.start();
	console.log('✓ Playing sine wave with cubic waveshaping (adds 3rd harmonic)');

	await new Promise(resolve => setTimeout(resolve, 500));

	osc.stop();
	await context.suspend();
	console.log('✓ Stopped');

	console.log('\n=== Waveshaping Synthesis Test Complete ===\n');
}

// Run tests
try {
	await testBasicWaveShaper();
	await testDifferentCurves();
	await testOversampleProperty();
	await testWaveshapingSynthesis();
	console.log('\n✅ All WaveShaperNode tests passed!\n');
	await context.close();
	process.exit(0);
} catch (error) {
	console.error('\n❌ Test failed:', error);
	console.error(error.stack);
	process.exit(1);
}
