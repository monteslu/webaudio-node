/**
 * Benchmark: Analyser Process() Overhead (Different FFT Buffer Sizes)
 *
 * Tests the Process() overhead of AnalyserNode with different FFT buffer sizes.
 * NOTE: This does NOT test actual FFT performance - it only measures the overhead
 * of storing samples in the circular buffer. No getFloatFrequencyData() calls are made.
 * For actual FFT performance testing, see bench-analyser.js
 *
 * Tests FFT sizes: 256, 512, 1024, 2048, 4096, 8192, 16384, 32768
 */

export async function benchmarkAnalyserProcessOverhead(OfflineAudioContext, iterations = 10) {
	const fftSizes = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
	const sampleRate = 48000;
	const duration = 1.0;
	const results = {};

	for (const fftSize of fftSizes) {
		const length = sampleRate * duration;
		const times = [];

		for (let i = 0; i < iterations; i++) {
			const ctx = new OfflineAudioContext({
				numberOfChannels: 2,
				length: length,
				sampleRate: sampleRate
			});

			// Create audio source
			const osc = ctx.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.value = 440;

			// Create analyser with specific FFT size
			const analyser = ctx.createAnalyser();
			analyser.fftSize = fftSize;
			analyser.smoothingTimeConstant = 0.8;

			const gain = ctx.createGain();
			gain.gain.value = 0.5;

			osc.connect(analyser);
			analyser.connect(gain);
			gain.connect(ctx.destination);

			osc.start(0);

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

		results[fftSize] = {
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
		byFFTSize: results
	};
}
