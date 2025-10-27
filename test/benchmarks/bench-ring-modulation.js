/**
 * Benchmark: Ring Modulation
 *
 * Tests amplitude modulation effects using gain multiplication
 * Common use case: Metallic effects, sci-fi sounds, frequency shifting
 */

export async function benchmarkRingModulation(OfflineAudioContext, iterations = 10) {
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

        // Create 8 ring modulated voices
        for (let j = 0; j < 8; j++) {
            // Carrier oscillator (audio signal)
            const carrier = ctx.createOscillator();
            carrier.frequency.value = 220 + j * 110;
            carrier.type = 'sawtooth';

            // Modulator oscillator (modulation signal)
            const modulator = ctx.createOscillator();
            modulator.frequency.value = 100 + j * 50; // Inharmonic modulation
            modulator.type = 'sine';

            // Gain for ring modulation
            const modulatorGain = ctx.createGain();
            modulatorGain.gain.value = 1.0;

            // Ring modulation = carrier * modulator
            const ringMod = ctx.createGain();
            ringMod.gain.value = 0.0; // Modulated by modulator

            const outputGain = ctx.createGain();
            outputGain.gain.value = 0.1;

            // Connect: carrier -> ringMod -> output
            carrier.connect(ringMod);
            ringMod.connect(outputGain);

            // Connect modulator to ringMod.gain (AM)
            modulator.connect(modulatorGain);
            modulatorGain.connect(ringMod.gain);

            outputGain.connect(ctx.destination);

            carrier.start(0);
            modulator.start(0);
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
