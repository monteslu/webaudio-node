/**
 * Benchmark: Panner Distance Models
 *
 * Tests the performance of different distance models (linear, inverse, exponential).
 * Uses 8 PannerNodes at varying distances to test distance attenuation calculations.
 */

export async function benchmarkDistanceModels(OfflineAudioContext, iterations = 10) {
    const distanceModels = ['linear', 'inverse', 'exponential'];
    const sampleRate = 48000;
    const duration = 1.0;
    const results = {};

    for (const distanceModel of distanceModels) {
        const length = sampleRate * duration;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const ctx = new OfflineAudioContext({
                numberOfChannels: 2,
                length: length,
                sampleRate: sampleRate
            });

            // Create 8 sound sources at different distances
            for (let j = 0; j < 8; j++) {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 200 + j * 50;

                const panner = ctx.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = distanceModel;
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;

                // Position sources at increasing distances
                const distance = 1 + j * 2; // 1, 3, 5, 7, 9, 11, 13, 15 meters
                panner.positionX.value = distance;
                panner.positionY.value = 0;
                panner.positionZ.value = 0;

                const gain = ctx.createGain();
                gain.gain.value = 0.1;

                osc.connect(panner);
                panner.connect(gain);
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

        results[distanceModel] = {
            avgTimeMs: avgTime,
            minTimeMs: minTime,
            samplesPerSec: samplesPerSec,
            realtimeMultiplier: realtimeMultiplier
        };
    }

    // Calculate overall average for benchmark runner
    const allTimes = Object.values(results).map(r => r.avgTimeMs);
    const overallAvg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

    return {
        avgTimeMs: overallAvg,
        byDistanceModel: results
    };
}
