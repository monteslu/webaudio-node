/**
 * Benchmark: Delay Modulation (Chorus/Flanger)
 *
 * Tests delay time modulation for chorus/flanger effects
 * Common use case: Guitar effects, vocal processing, stereo widening
 */

export async function benchmarkDelayModulation(OfflineAudioContext, iterations = 10) {
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

        // Create 4 sources with chorus effect (modulated delay)
        for (let j = 0; j < 4; j++) {
            const osc = ctx.createOscillator();
            osc.frequency.value = 220 + j * 110;
            osc.type = 'sawtooth';

            // Dry path
            const dryGain = ctx.createGain();
            dryGain.gain.value = 0.7;
            osc.connect(dryGain);

            // Wet path with modulated delay
            const delay = ctx.createDelay(0.05);
            delay.delayTime.value = 0.02; // 20ms base delay

            // Modulate delay time with LFO (creates chorus effect)
            const lfoRate = 0.5 + j * 0.5; // 0.5 - 2.5 Hz
            const lfoDepth = 0.005; // +/- 5ms modulation
            const steps = 1000;
            for (let k = 0; k < steps; k++) {
                const t = (k / steps) * duration;
                const modulation = lfoDepth * Math.sin(2 * Math.PI * lfoRate * t);
                delay.delayTime.setValueAtTime(0.02 + modulation, t);
            }

            const wetGain = ctx.createGain();
            wetGain.gain.value = 0.5;
            osc.connect(delay);
            delay.connect(wetGain);

            // Mix dry + wet
            const mix = ctx.createGain();
            dryGain.connect(mix);
            wetGain.connect(mix);
            mix.connect(ctx.destination);

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
