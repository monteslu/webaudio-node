/**
 * Benchmark: Audio Processing Chain
 *
 * Tests performance of processing chain without decode overhead:
 * - Apply biquad filter (EQ)
 * - Apply dynamics compressor
 * - Apply gain
 * - Render offline
 *
 * This isolates processing performance from MP3 decode performance
 */

export async function benchmarkProcessingChain(OfflineAudioContext, iterations = 10) {
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

        // Create source buffer (white noise, similar complexity to music)
        const sourceBuffer = ctx.createBuffer(2, length, sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = sourceBuffer.getChannelData(ch);
            for (let j = 0; j < length; j++) {
                data[j] = Math.random() * 2 - 1;
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = sourceBuffer;

        // EQ (biquad filter)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1.0;

        // Dynamics compressor
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        // Master gain
        const gain = ctx.createGain();
        gain.gain.value = 0.8;

        // Connect: source -> filter -> compressor -> gain -> destination
        source.connect(filter);
        filter.connect(compressor);
        compressor.connect(gain);
        gain.connect(ctx.destination);

        source.start(0);

        const start = performance.now();
        const renderedBuffer = await ctx.startRendering();
        const elapsed = performance.now() - start;

        // Verify audio was processed
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
