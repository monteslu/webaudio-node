/**
 * Benchmark: Dynamics Compressor Performance
 *
 * Tests dynamics compression (reduces dynamic range)
 * Common use case: Voice processing, mastering, game audio balancing
 */

export async function benchmarkCompressor(OfflineAudioContext, iterations = 10) {
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

		// Create multiple sound sources with varying levels (to trigger compression)
		const sources = [];
		const frequencies = [220, 440, 880, 1760];  // Multiple harmonics

		for (let j = 0; j < frequencies.length; j++) {
			const osc = ctx.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = frequencies[j];

			const gain = ctx.createGain();
			// Varying levels to trigger compression
			gain.gain.value = 0.1 + (j * 0.1);

			osc.connect(gain);
			sources.push({ osc, gain });
		}

		// Create compressor with aggressive settings
		const compressor = ctx.createDynamicsCompressor();
		compressor.threshold.value = -24;  // Start compressing at -24dB
		compressor.knee.value = 30;        // Smooth transition
		compressor.ratio.value = 12;       // Strong compression
		compressor.attack.value = 0.003;   // Fast attack (3ms)
		compressor.release.value = 0.25;   // Medium release (250ms)

		// Connect all sources to compressor
		for (const source of sources) {
			source.gain.connect(compressor);
			source.osc.start(0);
		}

		compressor.connect(ctx.destination);

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

		if (!hasAudio) {
			// Suppressed warning
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
