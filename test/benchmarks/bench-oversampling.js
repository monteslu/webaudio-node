/**
 * Benchmark: WaveShaper Oversampling Levels
 *
 * Tests the performance impact of different oversampling levels (none, 2x, 4x).
 * Oversampling reduces aliasing distortion but increases computational cost.
 */

export async function benchmarkOversampling(OfflineAudioContext, iterations = 10) {
	const oversampleLevels = ['none', '2x', '4x'];
	const sampleRate = 48000;
	const duration = 1.0;
	const results = {};

	// Create a waveshaping curve for soft clipping (hyperbolic tangent approximation)
	const curveLength = 4096;
	const curve = new Float32Array(curveLength);
	for (let i = 0; i < curveLength; i++) {
		const x = (i / (curveLength - 1)) * 2 - 1; // -1 to 1
		// Soft clipping curve (tanh approximation)
		curve[i] = x / (1 + Math.abs(x));
	}

	for (const oversample of oversampleLevels) {
		const length = sampleRate * duration;
		const times = [];

		for (let i = 0; i < iterations; i++) {
			const ctx = new OfflineAudioContext({
				numberOfChannels: 2,
				length: length,
				sampleRate: sampleRate
			});

			// Create 4 oscillators with different frequencies
			for (let j = 0; j < 4; j++) {
				const osc = ctx.createOscillator();
				osc.type = 'sawtooth';
				osc.frequency.value = 220 * (j + 1);

				const shaper = ctx.createWaveShaper();
				shaper.curve = curve;
				shaper.oversample = oversample;

				const gain = ctx.createGain();
				gain.gain.value = 0.3;

				osc.connect(shaper);
				shaper.connect(gain);
				gain.connect(ctx.destination);

				osc.start(0);
			}

			// Measure rendering time
			const start = performance.now();
			await ctx.startRendering();
			const elapsed = performance.now() - start;

			times.push(elapsed);
		}

		// Calculate statistics
		const avgTime = times.reduce((a, b) => a + b) / times.length;
		const minTime = Math.min(...times);
		const samplesGenerated = length * 2; // stereo
		const samplesPerSec = samplesGenerated / (avgTime / 1000);
		const realtimeMultiplier = (duration * 1000) / avgTime;

		results[oversample] = {
			avgTimeMs: avgTime,
			minTimeMs: minTime,
			samplesPerSec: samplesPerSec,
			realtimeMultiplier: realtimeMultiplier
		};
	}

	// Calculate overall average for benchmark runner
	const allTimes = Object.values(results).map(r => r.avgTimeMs);
	const overallAvg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

	return {
		avgTimeMs: overallAvg,
		byOversample: results
	};
}
