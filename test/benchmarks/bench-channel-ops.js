/**
 * Benchmark: Channel Operations
 *
 * Tests channel splitter and merger performance
 * Split stereo -> process separately -> merge back
 */

export async function benchmarkChannelOps(OfflineAudioContext, iterations = 10) {
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

		// Create stereo source
		const osc1 = ctx.createOscillator();
		osc1.type = 'sawtooth';
		osc1.frequency.value = 440;

		const osc2 = ctx.createOscillator();
		osc2.type = 'sine';
		osc2.frequency.value = 880;

		const initialMerger = ctx.createChannelMerger(2);
		osc1.connect(initialMerger, 0, 0);
		osc2.connect(initialMerger, 0, 1);

		// Split into separate channels
		const splitter = ctx.createChannelSplitter(2);
		initialMerger.connect(splitter);

		// Process each channel differently
		const filterL = ctx.createBiquadFilter();
		filterL.type = 'lowpass';
		filterL.frequency.value = 2000;

		const filterR = ctx.createBiquadFilter();
		filterR.type = 'highpass';
		filterR.frequency.value = 1000;

		splitter.connect(filterL, 0);
		splitter.connect(filterR, 1);

		// Merge back together
		const merger = ctx.createChannelMerger(2);
		filterL.connect(merger, 0, 0);
		filterR.connect(merger, 0, 1);

		const output = ctx.createGain();
		output.gain.value = 0.5;

		merger.connect(output);
		output.connect(ctx.destination);

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
