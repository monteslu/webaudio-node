import { AudioContext } from '../src/javascript/index.js';

console.log('🎛️  AudioWorklet Bit Crusher Example\n');
console.log('This example demonstrates custom audio processing using AudioWorkletNode');
console.log('Playing a sine wave through a bit crusher effect\n');

// Create audio context
const ctx = new AudioContext({ sampleRate: 48000, channels: 2 });

// Create oscillator
const osc = ctx.createOscillator();
osc.type = 'sine';
osc.frequency.value = 440;

// Create gain for volume control
const outputGain = ctx.createGain();
outputGain.gain.value = 0.3;

// Create AudioWorkletNode for bit crushing
const bitCrusher = ctx.createAudioWorklet('bit-crusher', {
	numberOfInputs: 1,
	numberOfOutputs: 1,
	parameterData: {
		bitDepth: {
			defaultValue: 8,
			minValue: 1,
			maxValue: 16
		},
		sampleRateReduction: {
			defaultValue: 0.5,
			minValue: 0.01,
			maxValue: 1.0
		}
	}
});

// Set the custom process function
bitCrusher.setProcessCallback((inputs, outputs, parameters, frameCount) => {
	const input = inputs[0];
	const output = outputs[0];
	const bitDepth = parameters.bitDepth || 8;
	const sampleRateReduction = parameters.sampleRateReduction || 0.5;

	// Bit depth reduction
	const step = Math.pow(2, bitDepth);
	const stepSize = 2.0 / step;

	// Sample rate reduction (simple hold)
	let lastSample = 0;

	// Process all samples (frameCount * channels)
	const sampleCount = input.length;
	for (let i = 0; i < sampleCount; i++) {
		// Sample rate reduction
		if (Math.random() > sampleRateReduction) {
			lastSample = input[i];
		}

		// Bit depth reduction
		const quantized = Math.floor(lastSample / stepSize) * stepSize;
		output[i] = Math.max(-1.0, Math.min(1.0, quantized));
	}
});

// Connect the graph
osc.connect(bitCrusher);
bitCrusher.connect(outputGain);
outputGain.connect(ctx.destination);

// Start playing
osc.start();
ctx.resume();

console.log('▶️  Playing 440Hz sine wave with bit crusher effect');
console.log('   Bit depth: 8 bits');
console.log('   Sample rate reduction: 50%');
console.log('   Duration: 3 seconds\n');

// Animate parameters
let time = 0;
const interval = setInterval(() => {
	time += 0.5;

	// Gradually increase bit depth
	const bitDepth = 1 + Math.floor((time / 3) * 15);
	bitCrusher.parameters.get('bitDepth').value = bitDepth;

	// Oscillate sample rate reduction
	const sampleRateReduction = 0.3 + 0.4 * Math.sin(time);
	bitCrusher.parameters.get('sampleRateReduction').value = sampleRateReduction;

	console.log(`⚙️  Bit depth: ${bitDepth.toFixed(0)} | Sample rate: ${(sampleRateReduction * 100).toFixed(0)}%`);

	if (time >= 3) {
		clearInterval(interval);
		console.log('\n✅ Example complete!');
		process.exit(0);
	}
}, 500);
