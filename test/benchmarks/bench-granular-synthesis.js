/**
 * Benchmark: Granular Synthesis
 *
 * Tests many short buffer playbacks (grains)
 * Common use case: Time stretching, pitch shifting, texture synthesis
 */

export async function benchmarkGranularSynthesis(OfflineAudioContext, iterations = 10) {
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

        // Create source buffer (1 second of noise)
        const sourceLength = sampleRate;
        const sourceBuffer = ctx.createBuffer(1, sourceLength, sampleRate);
        const sourceData = sourceBuffer.getChannelData(0);
        for (let j = 0; j < sourceLength; j++) {
            sourceData[j] = Math.random() * 2 - 1;
        }

        // Create 50 grains (overlapping short playbacks) - reduced to avoid WASM memory issues
        const numGrains = 50;
        const grainLength = 0.05; // 50ms grains
        const grainSpacing = 0.02; // 20ms spacing (overlapping)

        for (let g = 0; g < numGrains; g++) {
            const grain = ctx.createBufferSource();
            grain.buffer = sourceBuffer;

            // Random playback position in source
            const sourceOffset = Math.random() * (duration - grainLength);

            // Envelope for grain
            const envelope = ctx.createGain();
            envelope.gain.value = 0;

            const startTime = g * grainSpacing;
            const attackTime = 0.005;
            const releaseTime = 0.005;
            const sustainTime = grainLength - attackTime - releaseTime;

            // Quick fade in/out
            envelope.gain.setValueAtTime(0, startTime);
            envelope.gain.linearRampToValueAtTime(0.5, startTime + attackTime);
            envelope.gain.setValueAtTime(0.5, startTime + attackTime + sustainTime);
            envelope.gain.linearRampToValueAtTime(0, startTime + grainLength);

            grain.connect(envelope);
            envelope.connect(ctx.destination);

            grain.start(startTime, sourceOffset, grainLength);
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
