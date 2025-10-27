/**
 * Benchmark: Different Channel Counts
 *
 * Tests performance with different channel configurations (1, 2, 4, 6, 8 channels).
 * Uses oscillator -> filter -> gain -> destination to test real-world processing.
 */

export async function benchmarkChannelCounts(OfflineAudioContext, iterations = 10) {
	const channelCounts = [1, 2, 4, 6, 8];
	const duration = 1.0; // 1 second
	const sampleRate = 48000;
	const results = {};

	for (const channelCount of channelCounts) {
		const length = Math.floor(sampleRate * duration);
		const times = [];

		for (let i = 0; i < iterations; i++) {
			const ctx = new OfflineAudioContext({
				numberOfChannels: channelCount,
				length: length,
				sampleRate: sampleRate
			});

			// Create audio graph: oscillator -> filter -> gain -> destination
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

			// Measure rendering time
			const start = performance.now();
			await ctx.startRendering();
			const elapsed = performance.now() - start;

			times.push(elapsed);
		}

		// Calculate statistics
		const avgTime = times.reduce((a, b) => a + b) / times.length;
		const minTime = Math.min(...times);
		const samplesGenerated = length * channelCount;
		const samplesPerSec = samplesGenerated / (avgTime / 1000);
		const realtimeMultiplier = (duration * 1000) / avgTime;

		results[channelCount] = {
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
		byChannelCount: results
	};
}
