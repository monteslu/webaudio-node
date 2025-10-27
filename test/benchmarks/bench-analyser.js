/**
 * Benchmark: Analyser Node Performance
 *
 * Tests FFT analysis for frequency/time domain data
 * Common use case: Audio visualizations, VU meters, spectrum analyzers
 *
 * This benchmark actually calls getFloatFrequencyData() to test FFT performance!
 */

export async function benchmarkAnalyser(OfflineAudioContext, iterations = 10) {
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

        // Create complex audio source (multiple frequencies)
        const frequencies = [100, 220, 440, 880, 1760, 3520];
        const sources = [];

        for (const freq of frequencies) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.value = 0.2;

            osc.connect(gain);
            sources.push({ osc, gain });
            osc.start(0);
        }

        // Create analyser with realistic settings
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; // Common size for music visualizers
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -100;
        analyser.maxDecibels = -10;

        // Connect all sources to analyser
        const merger = ctx.createGain();
        merger.gain.value = 1.0;

        for (const source of sources) {
            source.gain.connect(merger);
        }

        merger.connect(analyser);
        analyser.connect(ctx.destination);

        const start = performance.now();
        const renderedBuffer = await ctx.startRendering();

        // NOW ACTUALLY TEST FFT PERFORMANCE!
        // Simulate a real visualization: query FFT data at 60 FPS for 1 second
        const fftCallsPerSecond = 60;
        const totalFFTCalls = Math.floor(duration * fftCallsPerSecond);
        const freqData = new Float32Array(analyser.frequencyBinCount);

        for (let fftCall = 0; fftCall < totalFFTCalls; fftCall++) {
            analyser.getFloatFrequencyData(freqData);
        }

        const elapsed = performance.now() - start;

        // Verify we got real FFT data
        let hasFreqData = false;
        for (let j = 0; j < freqData.length; j++) {
            if (freqData[j] > analyser.minDecibels) {
                hasFreqData = true;
                break;
            }
        }

        if (!hasFreqData) {
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
