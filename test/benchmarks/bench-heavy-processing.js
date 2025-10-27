/**
 * Benchmark: Heavy Processing Chain
 *
 * Tests a realistic heavy effects chain combining multiple processors
 * Common use case: DAW-style mixing, mastering chains, podcast processing
 */

export async function benchmarkHeavyProcessing(OfflineAudioContext, iterations = 10) {
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

		// Create input signal - 4 voice tracks
		const voices = [];
		for (let v = 0; v < 4; v++) {
			const osc = ctx.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.value = 110 + v * 55; // Bass-ish range

			// Per-voice processing chain:
			// EQ -> Compressor -> Distortion -> Reverb Send

			// 3-band EQ using biquad filters
			const lowShelf = ctx.createBiquadFilter();
			lowShelf.type = 'lowshelf';
			lowShelf.frequency.value = 200;
			lowShelf.gain.value = 3;

			const midPeak = ctx.createBiquadFilter();
			midPeak.type = 'peaking';
			midPeak.frequency.value = 1000;
			midPeak.Q.value = 1;
			midPeak.gain.value = -2;

			const highShelf = ctx.createBiquadFilter();
			highShelf.type = 'highshelf';
			highShelf.frequency.value = 5000;
			highShelf.gain.value = 2;

			// Compressor
			const compressor = ctx.createDynamicsCompressor();
			compressor.threshold.value = -24;
			compressor.knee.value = 30;
			compressor.ratio.value = 4;
			compressor.attack.value = 0.003;
			compressor.release.value = 0.25;

			// Subtle distortion
			const waveshaper = ctx.createWaveShaper();
			const curve = new Float32Array(256);
			for (let j = 0; j < 256; j++) {
				const x = (j / 128) - 1;
				curve[j] = Math.tanh(x * 1.5);
			}
			waveshaper.curve = curve;
			waveshaper.oversample = '2x';

			// Voice channel gain
			const voiceGain = ctx.createGain();
			voiceGain.gain.value = 0.25;

			// Connect voice chain
			osc.connect(lowShelf);
			lowShelf.connect(midPeak);
			midPeak.connect(highShelf);
			highShelf.connect(compressor);
			compressor.connect(waveshaper);
			waveshaper.connect(voiceGain);

			osc.start(0);
			voices.push(voiceGain);
		}

		// Master bus processing:
		// Convolver Reverb -> Master EQ -> Master Compressor -> Limiter

		// Mix voices
		const voiceMix = ctx.createGain();
		voiceMix.gain.value = 1.0;
		voices.forEach(voice => voice.connect(voiceMix));

		// Convolver reverb with 0.5s impulse
		const convolver = ctx.createConvolver();
		const impulseSampleRate = sampleRate;
		const impulseLength = Math.floor(sampleRate * 0.5);
		const impulseBuffer = ctx.createBuffer(2, impulseLength, impulseSampleRate);

		for (let channel = 0; channel < 2; channel++) {
			const impulseData = impulseBuffer.getChannelData(channel);
			for (let j = 0; j < impulseLength; j++) {
				impulseData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (sampleRate * 0.15));
			}
		}
		convolver.buffer = impulseBuffer;

		const reverbSend = ctx.createGain();
		reverbSend.gain.value = 0.3;

		const reverbReturn = ctx.createGain();
		reverbReturn.gain.value = 0.5;

		voiceMix.connect(reverbSend);
		reverbSend.connect(convolver);
		convolver.connect(reverbReturn);

		// Master EQ
		const masterLow = ctx.createBiquadFilter();
		masterLow.type = 'highpass';
		masterLow.frequency.value = 30;

		const masterHigh = ctx.createBiquadFilter();
		masterHigh.type = 'highshelf';
		masterHigh.frequency.value = 8000;
		masterHigh.gain.value = 1;

		// Master compressor (glue)
		const masterComp = ctx.createDynamicsCompressor();
		masterComp.threshold.value = -18;
		masterComp.knee.value = 12;
		masterComp.ratio.value = 3;
		masterComp.attack.value = 0.01;
		masterComp.release.value = 0.1;

		// Limiter (aggressive compressor)
		const limiter = ctx.createDynamicsCompressor();
		limiter.threshold.value = -3;
		limiter.knee.value = 0;
		limiter.ratio.value = 20;
		limiter.attack.value = 0.001;
		limiter.release.value = 0.05;

		// Master output gain
		const masterGain = ctx.createGain();
		masterGain.gain.value = 0.8;

		// Connect master chain
		voiceMix.connect(masterLow);
		reverbReturn.connect(masterLow);
		masterLow.connect(masterHigh);
		masterHigh.connect(masterComp);
		masterComp.connect(limiter);
		limiter.connect(masterGain);
		masterGain.connect(ctx.destination);

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
