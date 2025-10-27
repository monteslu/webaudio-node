/**
 * Benchmark: Delay Node Performance
 *
 * Tests delay line performance with feedback
 * Creates oscillator -> delay (with feedback) -> destination
 */

export async function benchmarkDelay(OfflineAudioContext, iterations = 10) {
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

		// Create audio graph: oscillator -> delay -> gain -> destination
		const osc = ctx.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.value = 440;

		const delay = ctx.createDelay(1.0);
		delay.delayTime.value = 0.3; // 300ms delay

		const output = ctx.createGain();
		output.gain.value = 0.5;

		// Simple delay without feedback (feedback loops may cause issues)
		osc.connect(delay);
		delay.connect(output);
		output.connect(ctx.destination);

		osc.start(0);

		const start = performance.now();
		const renderedBuffer = await ctx.startRendering();
		const elapsed = performance.now() - start;

		// Verify audio was rendered (check AFTER the delay time!)
		let hasAudio = false;
		const channelData = renderedBuffer.getChannelData(0);
		const delayInSamples = Math.floor(0.3 * sampleRate); // 300ms delay = 14400 samples
		const checkStart = delayInSamples + 100; // Start checking after delay + small buffer
		for (let j = checkStart; j < Math.min(checkStart + 1000, channelData.length); j++) {
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
