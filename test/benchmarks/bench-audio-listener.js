/**
 * Benchmark: AudioListener Position/Orientation Changes
 *
 * Tests the performance impact of moving the AudioListener position and orientation
 * while rendering 8 PannerNodes in 3D space. This simulates a moving listener in a game.
 */

export async function benchmarkAudioListener(OfflineAudioContext, iterations = 10) {
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

        // Create 8 sound sources positioned around the listener
        const sources = [];
        for (let j = 0; j < 8; j++) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 200 + j * 50;

            const panner = ctx.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;

            // Position sources in a circle around origin
            const angle = (j / 8) * Math.PI * 2;
            panner.positionX.value = Math.cos(angle) * 5;
            panner.positionY.value = 0;
            panner.positionZ.value = Math.sin(angle) * 5;

            const gain = ctx.createGain();
            gain.gain.value = 0.1;

            osc.connect(panner);
            panner.connect(gain);
            gain.connect(ctx.destination);

            osc.start(0);
            sources.push({ osc, panner });
        }

        // Move the listener in a circle (simulating player movement)
        const listener = ctx.listener;
        const numMoves = 50;
        for (let j = 0; j < numMoves; j++) {
            const time = (j / numMoves) * duration;
            const angle = (j / numMoves) * Math.PI * 2;

            // Position
            listener.positionX.setValueAtTime(Math.cos(angle) * 2, time);
            listener.positionY.setValueAtTime(0, time);
            listener.positionZ.setValueAtTime(Math.sin(angle) * 2, time);

            // Forward direction (looking towards center)
            listener.forwardX.setValueAtTime(-Math.cos(angle), time);
            listener.forwardY.setValueAtTime(0, time);
            listener.forwardZ.setValueAtTime(-Math.sin(angle), time);

            // Up direction (always pointing up)
            listener.upX.setValueAtTime(0, time);
            listener.upY.setValueAtTime(1, time);
            listener.upZ.setValueAtTime(0, time);
        }

        // Measure rendering time
        const start = performance.now();
        await ctx.startRendering();
        const elapsed = performance.now() - start;

        times.push(elapsed);
    }

    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);
    const samplesGenerated = length * 2; // stereo
    const samplesPerSec = samplesGenerated / (avgTime / 1000);
    const realtimeMultiplier = (duration * 1000) / avgTime;

    return {
        avgTimeMs: avgTime,
        minTimeMs: minTime,
        samplesPerSec: samplesPerSec,
        realtimeMultiplier: realtimeMultiplier,
        iterations: iterations
    };
}
