/**
 * Benchmark: Filter Modulation (A-rate automation)
 *
 * Tests BiquadFilter with audio-rate frequency modulation
 * Common use case: Auto-wah, filter sweeps, synthesizer VCF, wobble bass
 */

export async function benchmarkFilterModulation(OfflineAudioContext, iterations = 10) {
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

		// Create 4 oscillators with modulated filters
		for (let j = 0; j < 4; j++) {
			const osc = ctx.createOscillator();
			osc.frequency.value = 55 + j * 55; // Bass range
			osc.type = 'sawtooth';

			// Lowpass filter with modulated cutoff
			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = 500; // Base cutoff
			filter.Q.value = 10; // High resonance

			// Create LFO for filter modulation
			const lfo = ctx.createOscillator();
			lfo.frequency.value = 2 + j; // 2-5 Hz
			lfo.type = 'sine';

			const lfoGain = ctx.createGain();
			lfoGain.gain.value = 1500; // +/- 1500Hz modulation

			lfo.connect(lfoGain);
			lfoGain.connect(filter.frequency); // Audio-rate modulation!

			const gain = ctx.createGain();
			gain.gain.value = 0.2;

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(ctx.destination);

			osc.start(0);
			lfo.start(0);
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
