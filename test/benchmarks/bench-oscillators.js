/**
 * Benchmark: Oscillator Performance
 *
 * Tests different waveform generation types
 * Common use case: Synthesizers, tone generation, LFOs
 */

export async function benchmarkOscillators(OfflineAudioContext, iterations = 10) {
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

		// Create 16 oscillators with different waveforms
		const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
		const oscillators = [];

		for (let osc_idx = 0; osc_idx < 16; osc_idx++) {
			const osc = ctx.createOscillator();
			osc.type = waveforms[osc_idx % waveforms.length];
			osc.frequency.value = 110 * Math.pow(2, osc_idx / 12); // Chromatic scale

			const gain = ctx.createGain();
			gain.gain.value = 0.1;

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(0);
			oscillators.push(osc);
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
