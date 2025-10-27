/**
 * Benchmark: ConstantSource Node
 *
 * Tests ConstantSource nodes used for modulation
 * Common use case: LFO modulation, control signals, automation sources
 */

export async function benchmarkConstantSource(OfflineAudioContext, iterations = 10) {
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

		// Create 16 oscillators with ConstantSource modulation on frequency
		const oscillators = [];
		for (let j = 0; j < 16; j++) {
			const osc = ctx.createOscillator();
			osc.frequency.value = 220 + j * 55;

			// Create LFO using ConstantSource + scheduled automation
			const lfo = ctx.createConstantSource();
			lfo.offset.value = 5; // 5Hz vibrato depth

			// Schedule sine-like modulation using automation
			const modDepth = 10; // +/- 10Hz
			for (let t = 0; t < duration; t += 0.01) {
				lfo.offset.setValueAtTime(modDepth * Math.sin(2 * Math.PI * 5 * t), t);
			}

			// Connect LFO to oscillator frequency
			lfo.connect(osc.frequency);

			const gain = ctx.createGain();
			gain.gain.value = 0.05;

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(0);
			lfo.start(0);

			oscillators.push({ osc, lfo, gain });
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
