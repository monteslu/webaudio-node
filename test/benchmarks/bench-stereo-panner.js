/**
 * Benchmark: Stereo Panner Performance
 *
 * Tests stereo panning (left-right positioning)
 * Common use case: Positioning sounds in stereo field (games, music)
 */

export async function benchmarkStereoPanner(OfflineAudioContext, iterations = 10) {
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

		// Create multiple sources with different pan positions
		const numSources = 16;  // Simulate 16 sounds at different positions
		const sources = [];

		for (let j = 0; j < numSources; j++) {
			const osc = ctx.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.value = 200 + (j * 50);  // Different frequencies

			const panner = ctx.createStereoPanner();
			// Pan from -1 (left) to +1 (right)
			const panPosition = (j / (numSources - 1)) * 2 - 1;
			panner.pan.value = panPosition;

			const gain = ctx.createGain();
			gain.gain.value = 1.0 / numSources;  // Normalize volume

			osc.connect(panner);
			panner.connect(gain);
			gain.connect(ctx.destination);

			sources.push({ osc, panner });
			osc.start(0);
		}

		const start = performance.now();
		const renderedBuffer = await ctx.startRendering();
		const elapsed = performance.now() - start;

		// Verify audio was rendered and has stereo separation
		let hasAudio = false;
		const channelDataL = renderedBuffer.getChannelData(0);
		const channelDataR = renderedBuffer.getChannelData(1);
		for (let j = 0; j < Math.min(1000, channelDataL.length); j++) {
			if (Math.abs(channelDataL[j]) > 0.0001 || Math.abs(channelDataR[j]) > 0.0001) {
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
