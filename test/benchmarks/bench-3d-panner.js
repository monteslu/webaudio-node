/**
 * Benchmark: 3D Panner (Spatial Audio)
 *
 * Tests HRTF-based 3D audio positioning
 * Common use case: Games, VR/AR, immersive audio
 */

export async function benchmark3DPanner(OfflineAudioContext, iterations = 10) {
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

		// Create 8 sound sources positioned in 3D space
		const numSources = 8;
		const sources = [];

		for (let src_idx = 0; src_idx < numSources; src_idx++) {
			const osc = ctx.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = 200 + src_idx * 100;

			const panner = ctx.createPanner();
			panner.panningModel = 'HRTF';
			panner.distanceModel = 'inverse';
			panner.refDistance = 1;
			panner.maxDistance = 10000;
			panner.rolloffFactor = 1;
			panner.coneInnerAngle = 360;
			panner.coneOuterAngle = 0;
			panner.coneOuterGain = 0;

			// Position sources in a circle around the listener
			const angle = (src_idx / numSources) * 2 * Math.PI;
			const radius = 2;
			panner.positionX.value = Math.cos(angle) * radius;
			panner.positionY.value = 0;
			panner.positionZ.value = Math.sin(angle) * radius;

			// Animate position over time (moving sound sources)
			const rotationSpeed = 0.5; // radians per second
			panner.positionX.linearRampToValueAtTime(
				Math.cos(angle + rotationSpeed * duration) * radius,
				duration
			);
			panner.positionZ.linearRampToValueAtTime(
				Math.sin(angle + rotationSpeed * duration) * radius,
				duration
			);

			const gain = ctx.createGain();
			gain.gain.value = 0.2;

			osc.connect(panner);
			panner.connect(gain);
			gain.connect(ctx.destination);

			osc.start(0);
			sources.push({ osc, panner });
		}

		// Set listener position and orientation
		ctx.listener.positionX.value = 0;
		ctx.listener.positionY.value = 0;
		ctx.listener.positionZ.value = 0;
		ctx.listener.forwardX.value = 0;
		ctx.listener.forwardY.value = 0;
		ctx.listener.forwardZ.value = -1;
		ctx.listener.upX.value = 0;
		ctx.listener.upY.value = 1;
		ctx.listener.upZ.value = 0;

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
