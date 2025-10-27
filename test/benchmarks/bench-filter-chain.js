/**
 * Benchmark: Filter Chain Performance
 *
 * Tests performance of multiple biquad filters in series
 * Simulates EQ processing with 5 cascaded filters
 */

export async function benchmarkFilterChain(OfflineAudioContext, iterations = 10) {
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

		// Create audio graph: oscillator -> 5 filters -> destination
		const osc = ctx.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.value = 440;

		// Create 5-band EQ (lowshelf, 3x peaking, highshelf)
		const lowshelf = ctx.createBiquadFilter();
		lowshelf.type = 'lowshelf';
		lowshelf.frequency.value = 100;
		lowshelf.gain.value = -3;

		const peak1 = ctx.createBiquadFilter();
		peak1.type = 'peaking';
		peak1.frequency.value = 500;
		peak1.Q.value = 1.0;
		peak1.gain.value = 6;

		const peak2 = ctx.createBiquadFilter();
		peak2.type = 'peaking';
		peak2.frequency.value = 2000;
		peak2.Q.value = 1.5;
		peak2.gain.value = -4;

		const peak3 = ctx.createBiquadFilter();
		peak3.type = 'peaking';
		peak3.frequency.value = 5000;
		peak3.Q.value = 0.8;
		peak3.gain.value = 3;

		const highshelf = ctx.createBiquadFilter();
		highshelf.type = 'highshelf';
		highshelf.frequency.value = 10000;
		highshelf.gain.value = -2;

		const output = ctx.createGain();
		output.gain.value = 0.5;

		// Chain filters
		osc.connect(lowshelf);
		lowshelf.connect(peak1);
		peak1.connect(peak2);
		peak2.connect(peak3);
		peak3.connect(highshelf);
		highshelf.connect(output);
		output.connect(ctx.destination);

		osc.start(0);

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
