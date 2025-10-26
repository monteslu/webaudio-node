import { AudioContext } from '../src/javascript/index.js';

const context = new AudioContext();

async function testAnalyserNode() {
	console.log('\n=== Testing AnalyserNode ===\n');

	// Create analyser
	const analyser = context.createAnalyser();
	console.log('✓ Created AnalyserNode');

	// Test properties
	console.log('Default FFT size:', analyser.fftSize);
	console.log('Frequency bin count:', analyser.frequencyBinCount);
	console.log('Min decibels:', analyser.minDecibels);
	console.log('Max decibels:', analyser.maxDecibels);
	console.log('Smoothing time constant:', analyser.smoothingTimeConstant);

	// Test setting FFT size
	analyser.fftSize = 1024;
	console.log('✓ Set FFT size to 1024');
	console.log('New frequency bin count:', analyser.frequencyBinCount);

	// Test setting decibel range
	analyser.minDecibels = -90;
	analyser.maxDecibels = -20;
	console.log('✓ Set decibel range to -90 to -20');

	// Test setting smoothing
	analyser.smoothingTimeConstant = 0.5;
	console.log('✓ Set smoothing time constant to 0.5');

	// Create oscillator and connect to analyser
	const osc = context.createOscillator();
	osc.frequency.value = 440; // A4
	osc.type = 'sine';
	osc.connect(analyser);
	analyser.connect(context.destination);
	console.log('✓ Connected oscillator -> analyser -> destination');

	// Start audio
	await context.resume();
	osc.start();
	console.log('✓ Started oscillator at 440 Hz');

	// Wait a bit for data to accumulate
	await new Promise(resolve => setTimeout(resolve, 100));

	// Test frequency data retrieval
	const freqData = new Float32Array(analyser.frequencyBinCount);
	analyser.getFloatFrequencyData(freqData);
	console.log('✓ Got float frequency data');

	// Find peak frequency
	let maxMag = -Infinity;
	let peakBin = 0;
	for (let i = 0; i < freqData.length; i++) {
		if (freqData[i] > maxMag) {
			maxMag = freqData[i];
			peakBin = i;
		}
	}
	const peakFreq = peakBin * context.sampleRate / analyser.fftSize;
	console.log(`Peak frequency: ${peakFreq.toFixed(2)} Hz (bin ${peakBin})`);
	console.log(`Peak magnitude: ${maxMag.toFixed(2)} dB`);

	// Test byte frequency data
	const byteFreqData = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(byteFreqData);
	console.log('✓ Got byte frequency data');

	// Test time domain data
	const timeData = new Float32Array(analyser.fftSize);
	analyser.getFloatTimeDomainData(timeData);
	console.log('✓ Got float time domain data');

	// Check for oscillating signal
	const avgAmplitude = timeData.reduce((sum, val) => sum + Math.abs(val), 0) / timeData.length;
	console.log(`Average amplitude: ${avgAmplitude.toFixed(4)}`);

	// Test byte time domain data
	const byteTimeData = new Uint8Array(analyser.fftSize);
	analyser.getByteTimeDomainData(byteTimeData);
	console.log('✓ Got byte time domain data');

	// Stop and cleanup
	osc.stop();
	await context.suspend();
	console.log('✓ Stopped oscillator');

	console.log('\n=== AnalyserNode Test Complete ===\n');
}

async function testMultipleFrequencies() {
	console.log('\n=== Testing Multiple Frequencies ===\n');

	const analyser = context.createAnalyser();
	analyser.fftSize = 4096; // Higher resolution
	analyser.smoothingTimeConstant = 0;

	// Create three oscillators at different frequencies
	const osc1 = context.createOscillator();
	osc1.frequency.value = 220; // A3

	const osc2 = context.createOscillator();
	osc2.frequency.value = 440; // A4

	const osc3 = context.createOscillator();
	osc3.frequency.value = 880; // A5

	// Mix them
	const mixer = context.createGain();
	mixer.gain.value = 0.33;

	osc1.connect(mixer);
	osc2.connect(mixer);
	osc3.connect(mixer);
	mixer.connect(analyser);
	analyser.connect(context.destination);

	await context.resume();
	osc1.start();
	osc2.start();
	osc3.start();
	console.log('✓ Started three oscillators (220, 440, 880 Hz)');

	// Wait for data
	await new Promise(resolve => setTimeout(resolve, 200));

	// Analyze spectrum
	const freqData = new Float32Array(analyser.frequencyBinCount);
	analyser.getFloatFrequencyData(freqData);

	// Find top 5 peaks
	const peaks = [];
	for (let i = 1; i < freqData.length - 1; i++) {
		if (freqData[i] > freqData[i-1] && freqData[i] > freqData[i+1] && freqData[i] > -60) {
			peaks.push({
				bin: i,
				freq: i * context.sampleRate / analyser.fftSize,
				magnitude: freqData[i]
			});
		}
	}
	peaks.sort((a, b) => b.magnitude - a.magnitude);

	console.log('Top 5 frequency peaks:');
	for (let i = 0; i < Math.min(5, peaks.length); i++) {
		console.log(`  ${peaks[i].freq.toFixed(2)} Hz - ${peaks[i].magnitude.toFixed(2)} dB`);
	}

	// Stop
	osc1.stop();
	osc2.stop();
	osc3.stop();
	await context.suspend();
	console.log('✓ Stopped oscillators');

	console.log('\n=== Multiple Frequencies Test Complete ===\n');
}

// Run tests
try {
	await testAnalyserNode();
	await testMultipleFrequencies();
	console.log('\n✅ All AnalyserNode tests passed!\n');
	await context.close();
	process.exit(0);
} catch (error) {
	console.error('\n❌ Test failed:', error);
	console.error(error.stack);
	process.exit(1);
}
