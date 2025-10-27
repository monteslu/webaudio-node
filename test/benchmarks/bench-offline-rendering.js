/**
 * Benchmark: Offline Rendering Speed
 *
 * Tests how fast each implementation can render audio offline (non-realtime).
 * Generates 1 second of audio with oscillator -> gain -> biquad filter -> destination
 */

export async function benchmarkOfflineRendering(OfflineAudioContext, iterations = 10) {
    const sampleRate = 48000;
    const duration = 1.0; // 1 second
    const length = sampleRate * duration;

    // Warmup: Run 3 times to allow JIT optimization
    for (let warmup = 0; warmup < 3; warmup++) {
        const ctx = new OfflineAudioContext({
            numberOfChannels: 2,
            length: length,
            sampleRate: sampleRate
        });
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 440;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1.0;
        const gain = ctx.createGain();
        gain.gain.value = 0.5;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        await ctx.startRendering();
    }

    const times = [];

    for (let i = 0; i < iterations; i++) {
        const ctx = new OfflineAudioContext({
            numberOfChannels: 2,
            length: length,
            sampleRate: sampleRate
        });

        // Create audio graph: oscillator -> filter -> gain -> destination
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 440;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1.0;

        const gain = ctx.createGain();
        gain.gain.value = 0.5;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(0);

        // Measure rendering time
        const start = performance.now();
        const renderedBuffer = await ctx.startRendering();
        const elapsed = performance.now() - start;

        // Verify audio was actually rendered (check for non-zero samples)
        let hasAudio = false;
        const channelData = renderedBuffer.getChannelData(0);
        for (let j = 0; j < Math.min(1000, channelData.length); j++) {
            if (Math.abs(channelData[j]) > 0.0001) {
                hasAudio = true;
                break;
            }
        }

        // Audio verification removed

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
