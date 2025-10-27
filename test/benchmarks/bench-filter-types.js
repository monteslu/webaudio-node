/**
 * Benchmark: Filter Types
 *
 * Tests all BiquadFilter types
 * Common use case: EQ, tone shaping, frequency analysis
 */

export async function benchmarkFilterTypes(OfflineAudioContext, iterations = 10) {
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

        // Test all 8 filter types
        const filterTypes = [
            'lowpass',
            'highpass',
            'bandpass',
            'lowshelf',
            'highshelf',
            'peaking',
            'notch',
            'allpass'
        ];

        for (let j = 0; j < filterTypes.length; j++) {
            const osc = ctx.createOscillator();
            osc.frequency.value = 440;
            osc.type = 'sawtooth';

            const filter = ctx.createBiquadFilter();
            filter.type = filterTypes[j];
            filter.frequency.value = 1000 + j * 500;
            filter.Q.value = 5;
            filter.gain.value = 6; // For shelf/peaking filters

            const gain = ctx.createGain();
            gain.gain.value = 0.1;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(0);
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
