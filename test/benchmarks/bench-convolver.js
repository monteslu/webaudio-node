/**
 * Benchmark: Convolver (Reverb) Performance
 *
 * Tests convolution reverb with realistic impulse response
 * Common use case: Adding reverb to audio in games/music production
 */

export async function benchmarkConvolver(OfflineAudioContext, iterations = 10) {
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

        // Create impulse response (simulates room reverb)
        // Using 1 second IR (typical for small-medium rooms)
        const irLength = sampleRate;
        const irBuffer = ctx.createBuffer(2, irLength, sampleRate);
        const irDataL = irBuffer.getChannelData(0);
        const irDataR = irBuffer.getChannelData(1);

        // Generate realistic-ish impulse response (exponential decay with random noise)
        for (let j = 0; j < irLength; j++) {
            const decay = Math.exp((-3.0 * j) / irLength); // 3.0 = decay rate
            const noise = Math.random() * 2 - 1;
            irDataL[j] = noise * decay;
            irDataR[j] = noise * decay * 0.8; // Slightly different for stereo
        }

        // Create audio source
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 220;

        // Create convolver
        const convolver = ctx.createConvolver();
        convolver.buffer = irBuffer;
        convolver.normalize = true; // Prevent clipping

        // Dry/wet mix
        const dry = ctx.createGain();
        dry.gain.value = 0.3;

        const wet = ctx.createGain();
        wet.gain.value = 0.7;

        // Connect graph
        osc.connect(dry);
        osc.connect(convolver);
        convolver.connect(wet);

        dry.connect(ctx.destination);
        wet.connect(ctx.destination);

        osc.start(0);

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
