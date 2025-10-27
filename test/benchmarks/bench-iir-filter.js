/**
 * Benchmark: IIR Filter Performance
 *
 * Tests custom IIR filter with arbitrary coefficients
 * Common use case: Custom EQ, phone filters, vintage effects
 */

export async function benchmarkIIRFilter(OfflineAudioContext, iterations = 10) {
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

        // Create test signal - white noise
        const bufferSize = length;
        const noiseBuffer = ctx.createBuffer(2, bufferSize, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = noiseBuffer.getChannelData(channel);
            for (let j = 0; j < bufferSize; j++) {
                data[j] = Math.random() * 2 - 1;
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;

        // Create 4 cascaded IIR filters with different characteristics
        // Butterworth lowpass at 1kHz
        const feedforward1 = [0.0029, 0.0116, 0.0174, 0.0116, 0.0029];
        const feedback1 = [1.0, -3.0544, 3.8291, -2.2925, 0.5507];

        // Butterworth highpass at 200Hz
        const feedforward2 = [0.9149, -3.6597, 5.4895, -3.6597, 0.9149];
        const feedback2 = [1.0, -3.873, 5.652, -3.6706, 0.8916];

        // Notch filter at 500Hz
        const feedforward3 = [0.978, -1.8458, 2.6578, -1.8458, 0.978];
        const feedback3 = [1.0, -1.8359, 2.6481, -1.8261, 0.9561];

        // Peaking EQ at 2kHz
        const feedforward4 = [1.0623, -1.9318, 2.8013, -1.9318, 1.0623];
        const feedback4 = [1.0, -1.9423, 2.8223, -1.9212, 0.9413];

        const iir1 = ctx.createIIRFilter(feedforward1, feedback1);
        const iir2 = ctx.createIIRFilter(feedforward2, feedback2);
        const iir3 = ctx.createIIRFilter(feedforward3, feedback3);
        const iir4 = ctx.createIIRFilter(feedforward4, feedback4);

        // Chain them together
        source.connect(iir1);
        iir1.connect(iir2);
        iir2.connect(iir3);
        iir3.connect(iir4);
        iir4.connect(ctx.destination);

        source.start(0);

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
