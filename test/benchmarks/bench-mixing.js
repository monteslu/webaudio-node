/**
 * Benchmark: Mixing Performance
 *
 * Tests how efficiently each implementation can mix multiple audio sources.
 * Creates 100 buffer sources playing simultaneously through gain nodes.
 */

export async function benchmarkMixing(OfflineAudioContext, numSources = 100, iterations = 5) {
    const sampleRate = 48000;
    const duration = 0.5; // 0.5 seconds
    const length = sampleRate * duration;

    // Create a simple audio buffer (sine wave)
    function createTestBuffer(ctx) {
        const bufferLength = sampleRate * 0.1; // 100ms buffer
        const buffer = ctx.createBuffer(2, bufferLength, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferLength; i++) {
                data[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.1;
            }
        }

        return buffer;
    }

    const times = [];

    for (let iter = 0; iter < iterations; iter++) {
        const ctx = new OfflineAudioContext({
            numberOfChannels: 2,
            length: length,
            sampleRate: sampleRate
        });

        const sharedBuffer = createTestBuffer(ctx);

        // Create many buffer sources all playing the same buffer
        for (let i = 0; i < numSources; i++) {
            const source = ctx.createBufferSource();
            source.buffer = sharedBuffer;
            source.loop = true;

            const gain = ctx.createGain();
            gain.gain.value = 1.0 / numSources; // Normalize volume

            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);
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

    return {
        numSources: numSources,
        avgTimeMs: avgTime,
        minTimeMs: minTime,
        samplesPerSec: samplesPerSec,
        iterations: iterations
    };
}
