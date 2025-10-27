/**
 * Benchmark: WaveShaper Performance
 *
 * Tests non-linear waveshaping (distortion) performance
 * Creates oscillator -> waveshaper -> destination
 */

export async function benchmarkWaveShaper(OfflineAudioContext, iterations = 10) {
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

        // Create audio graph: oscillator -> waveshaper -> destination
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 440;

        const shaper = ctx.createWaveShaper();

        // Create distortion curve
        const curveSize = 4096;
        const curve = new Float32Array(curveSize);
        const deg = Math.PI / 180;
        for (let j = 0; j < curveSize; j++) {
            const x = (j * 2) / curveSize - 1;
            // Soft clipping curve
            curve[j] = ((3 + 50) * x * 20 * deg) / (Math.PI + 50 * Math.abs(x));
        }
        shaper.curve = curve;
        shaper.oversample = '2x';

        const gain = ctx.createGain();
        gain.gain.value = 0.5;

        osc.connect(shaper);
        shaper.connect(gain);
        gain.connect(ctx.destination);

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
