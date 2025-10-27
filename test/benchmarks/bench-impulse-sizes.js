/**
 * Benchmark: Convolver Impulse Response Sizes
 *
 * Tests the performance of ConvolverNode with different impulse response lengths.
 * Longer impulses create more realistic reverb but require more CPU for convolution.
 * Tests sizes: 0.1s, 0.5s, 1.0s, 2.0s, 4.0s
 */

export async function benchmarkImpulseSizes(OfflineAudioContext, iterations = 10) {
    const impulseDurations = [0.1, 0.5, 1.0, 2.0, 4.0]; // seconds
    const sampleRate = 48000;
    const duration = 1.0;
    const results = {};

    for (const impulseDuration of impulseDurations) {
        const length = sampleRate * duration;
        const times = [];

        // Create impulse response (decaying exponential noise for realistic reverb)
        const impulseLength = Math.floor(sampleRate * impulseDuration);
        const impulseBuffer = new Float32Array(impulseLength);
        for (let i = 0; i < impulseLength; i++) {
            const decay = Math.exp((-3 * i) / impulseLength); // Decay over time
            impulseBuffer[i] = (Math.random() * 2 - 1) * decay;
        }

        for (let i = 0; i < iterations; i++) {
            const ctx = new OfflineAudioContext({
                numberOfChannels: 2,
                length: length,
                sampleRate: sampleRate
            });

            // Create audio buffer for impulse response
            const impulse = ctx.createBuffer(2, impulseLength, sampleRate);
            impulse.copyToChannel(impulseBuffer, 0);
            impulse.copyToChannel(impulseBuffer, 1);

            // Create 2 sources with convolver
            for (let j = 0; j < 2; j++) {
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.value = 220 + j * 110;

                const convolver = ctx.createConvolver();
                convolver.buffer = impulse;
                convolver.normalize = true;

                const gain = ctx.createGain();
                gain.gain.value = 0.3;

                osc.connect(convolver);
                convolver.connect(gain);
                gain.connect(ctx.destination);

                osc.start(0);
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

        results[impulseDuration] = {
            avgTimeMs: avgTime,
            minTimeMs: minTime,
            samplesPerSec: samplesPerSec,
            realtimeMultiplier: realtimeMultiplier,
            impulseLengthSamples: impulseLength
        };
    }

    // Calculate overall average for benchmark runner
    const allTimes = Object.values(results).map(r => r.avgTimeMs);
    const overallAvg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

    return {
        avgTimeMs: overallAvg,
        byImpulseDuration: results
    };
}
