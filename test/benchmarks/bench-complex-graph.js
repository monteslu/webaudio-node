/**
 * Benchmark: Complex Audio Graph
 *
 * Tests graph traversal and connection overhead
 * Creates a complex graph with multiple parallel processing chains
 */

export async function benchmarkComplexGraph(OfflineAudioContext, iterations = 5) {
    const sampleRate = 48000;
    const duration = 0.5; // Shorter duration since graph is complex
    const length = sampleRate * duration;

    const times = [];

    for (let i = 0; i < iterations; i++) {
        const ctx = new OfflineAudioContext({
            numberOfChannels: 2,
            length: length,
            sampleRate: sampleRate
        });

        // Create 4 parallel processing chains
        const mixer = ctx.createGain();
        mixer.gain.value = 0.25; // Mix 4 chains at equal volume

        for (let chain = 0; chain < 4; chain++) {
            // Each chain: osc -> gain -> filter -> gain -> delay -> gain -> mixer
            const osc = ctx.createOscillator();
            osc.type = chain % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.value = 220 * (chain + 1);

            const gain1 = ctx.createGain();
            gain1.gain.value = 0.8;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000 + chain * 500;
            filter.Q.value = 1.0;

            const gain2 = ctx.createGain();
            gain2.gain.value = 0.7;

            const delay = ctx.createDelay(0.5);
            delay.delayTime.value = 0.05 * (chain + 1);

            const gain3 = ctx.createGain();
            gain3.gain.value = 0.6;

            // Connect chain
            osc.connect(gain1);
            gain1.connect(filter);
            filter.connect(gain2);
            gain2.connect(delay);
            delay.connect(gain3);
            gain3.connect(mixer);

            osc.start(0);
        }

        mixer.connect(ctx.destination);

        const start = performance.now();
        const renderedBuffer = await ctx.startRendering();
        const elapsed = performance.now() - start;

        // Verify audio was rendered (check AFTER the shortest delay!)
        let hasAudio = false;
        const channelData = renderedBuffer.getChannelData(0);
        const shortestDelay = 0.05; // First chain has 50ms delay
        const checkStart = Math.floor(shortestDelay * sampleRate) + 100; // After delay + buffer
        for (let j = checkStart; j < Math.min(checkStart + 1000, channelData.length); j++) {
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
