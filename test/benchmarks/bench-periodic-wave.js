/**
 * Benchmark: PeriodicWave (Custom Oscillator Waveforms)
 *
 * Tests custom waveforms using setPeriodicWave
 * Common use case: Additive synthesis, custom timbres, wavetable synthesis
 */

export async function benchmarkPeriodicWave(OfflineAudioContext, iterations = 10) {
	const sampleRate = 48000;
	const duration = 1.0;
	const length = sampleRate * duration;

	const times = [];

	for (let i = 0; i < iterations; i++) {
		const ctx = new OfflineAudioContext({
			numberOfChannels: 2,
			length: length,
			sampleRate: sampleRate
		});

		// Create 8 oscillators with different custom waveforms
		for (let j = 0; j < 8; j++) {
			const osc = ctx.createOscillator();
			osc.frequency.value = 110 + j * 55;

			// Create custom waveform using additive synthesis (sum of harmonics)
			const numHarmonics = 32;
			const real = new Float32Array(numHarmonics);
			const imag = new Float32Array(numHarmonics);

			// Different harmonic content for each oscillator
			for (let h = 0; h < numHarmonics; h++) {
				// Vary harmonic amplitude based on oscillator index
				const harmonicNum = h + 1;
				real[h] = 0; // Cosine component
				imag[h] = (1 / harmonicNum) * Math.exp(-harmonicNum * j * 0.1); // Sine component with decay
			}

			const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
			osc.setPeriodicWave(wave);

			const gain = ctx.createGain();
			gain.gain.value = 0.1;

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(0);
		}

		const start = performance.now();
		const renderedBuffer = await ctx.startRendering();
		const elapsed = performance.now() - start;

		// Verify audio was rendered
		let hasAudio = false;
		const channelData = renderedBuffer.getChannelData(0);
		for (let j = 0; j < Math.min(1000, channelData.length); j++) {
			if (Math.abs(channelData[j]) > 0.0001) {
				hasAudio = true;
				break;
			}
		}

		times.push(elapsed);
	}

	const avgTime = times.reduce((a, b) => a + b) / times.length;
	const minTime = Math.min(...times);
	const samplesPerSec = (sampleRate * duration * 1000) / avgTime;
	const realtimeMultiplier = samplesPerSec / sampleRate;

	return {
		avgTimeMs: avgTime,
		minTimeMs: minTime,
		samplesPerSec: samplesPerSec,
		realtimeMultiplier: realtimeMultiplier,
		iterations: iterations
	};
}
