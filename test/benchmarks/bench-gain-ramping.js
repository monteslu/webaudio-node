/**
 * Benchmark: Gain Ramping (Crossfades)
 *
 * Tests rapid gain changes for crossfading
 * Common use case: DJ mixing, playlist transitions, audio editing
 */

export async function benchmarkGainRamping(OfflineAudioContext, iterations = 10) {
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

		// Create two audio sources
		const osc1 = ctx.createOscillator();
		osc1.frequency.value = 440;
		const gain1 = ctx.createGain();
		gain1.gain.value = 1.0;
		osc1.connect(gain1);

		const osc2 = ctx.createOscillator();
		osc2.frequency.value = 880;
		const gain2 = ctx.createGain();
		gain2.gain.value = 0.0;
		osc2.connect(gain2);

		// Mix to destination
		const mix = ctx.createGain();
		gain1.connect(mix);
		gain2.connect(mix);
		mix.connect(ctx.destination);

		// Perform 20 crossfades (back and forth)
		const numCrossfades = 20;
		const crossfadeTime = duration / numCrossfades;

		for (let j = 0; j < numCrossfades; j++) {
			const startTime = j * crossfadeTime;
			const endTime = (j + 1) * crossfadeTime;

			if (j % 2 === 0) {
				// Fade out source 1, fade in source 2
				gain1.gain.setValueAtTime(gain1.gain.value, startTime);
				gain1.gain.linearRampToValueAtTime(0.0, endTime);
				gain2.gain.setValueAtTime(gain2.gain.value, startTime);
				gain2.gain.linearRampToValueAtTime(1.0, endTime);
			} else {
				// Fade in source 1, fade out source 2
				gain1.gain.setValueAtTime(gain1.gain.value, startTime);
				gain1.gain.linearRampToValueAtTime(1.0, endTime);
				gain2.gain.setValueAtTime(gain2.gain.value, startTime);
				gain2.gain.linearRampToValueAtTime(0.0, endTime);
			}
		}

		osc1.start(0);
		osc2.start(0);

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
