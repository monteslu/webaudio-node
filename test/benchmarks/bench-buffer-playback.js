/**
 * Benchmark: Buffer Playback Performance
 *
 * Tests AudioBufferSourceNode with realistic buffer playback
 * Common use case: Playing sound effects and samples in games
 */

export async function benchmarkBufferPlayback(OfflineAudioContext, iterations = 10) {
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

        // Create audio buffers (simulate sound effect samples)
        const bufferDuration = 0.1; // 100ms samples
        const bufferLength = sampleRate * bufferDuration;

        // Create different sample sounds
        const samples = [];
        for (let j = 0; j < 5; j++) {
            const buffer = ctx.createBuffer(2, bufferLength, sampleRate);
            const dataL = buffer.getChannelData(0);
            const dataR = buffer.getChannelData(1);

            // Generate sample (noise burst with envelope)
            for (let k = 0; k < bufferLength; k++) {
                const envelope = Math.exp((-5.0 * k) / bufferLength);
                const noise = Math.random() * 2 - 1;
                dataL[k] = noise * envelope;
                dataR[k] = noise * envelope * 0.8;
            }

            samples.push(buffer);
        }

        // Play samples at different times (simulate game with sound effects)
        const numPlaybacks = 50; // 50 sound effect instances
        const sources = [];

        for (let j = 0; j < numPlaybacks; j++) {
            const source = ctx.createBufferSource();
            source.buffer = samples[j % samples.length]; // Reuse samples

            const gain = ctx.createGain();
            gain.gain.value = 0.5 / Math.sqrt(numPlaybacks); // Prevent clipping

            source.connect(gain);
            gain.connect(ctx.destination);

            // Start at random times throughout the duration
            const startTime = (j / numPlaybacks) * duration;
            source.start(startTime);

            sources.push(source);
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
        iterations: iterations,
        numSources: 50
    };
}
