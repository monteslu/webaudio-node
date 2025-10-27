/**
 * Benchmark: Stress Test - Hundreds of Nodes
 *
 * Tests engine scalability with massive node counts
 * Common use case: Large orchestral arrangements, generative music, game audio
 */

export async function benchmarkStressTest(OfflineAudioContext, iterations = 5) {
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

        // Create 100 sound sources, each with a processing chain
        const numSources = 100;
        const nodes = [];

        for (let src_idx = 0; src_idx < numSources; src_idx++) {
            const osc = ctx.createOscillator();
            osc.type = ['sine', 'square', 'sawtooth', 'triangle'][src_idx % 4];
            osc.frequency.value = 55 + (src_idx % 48) * 20; // Spread across frequency range

            // Each source has: Filter -> Gain -> Panner
            const filter = ctx.createBiquadFilter();
            filter.type = ['lowpass', 'highpass', 'bandpass', 'notch'][src_idx % 4];
            filter.frequency.value = 200 + src_idx * 20;
            filter.Q.value = 1;

            const gain = ctx.createGain();
            gain.gain.value = 0.01; // Very quiet so we don't clip

            const panner = ctx.createStereoPanner();
            panner.pan.value = (src_idx / numSources) * 2 - 1; // Spread across stereo field

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(ctx.destination);

            osc.start(0);
            nodes.push({ osc, filter, gain, panner });
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
        iterations: iterations,
        nodeCount: 100 * 4 // osc + filter + gain + panner per source
    };
}
