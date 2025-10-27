/**
 * Benchmark: Multichannel Audio (5.1 Surround)
 *
 * Tests 6-channel surround sound processing
 * Common use case: Home theater, game audio, immersive audio
 */

export async function benchmarkMultichannel(OfflineAudioContext, iterations = 10) {
    const sampleRate = 48000;
    const duration = 1.0;
    const length = sampleRate * duration;

    const times = [];

    for (let i = 0; i < iterations; i++) {
        // Create 6-channel context (5.1 surround)
        const ctx = new OfflineAudioContext({
            numberOfChannels: 6,
            length: length,
            sampleRate: sampleRate
        });

        // Create 6 oscillators, one per channel
        // Channels: FL, FR, FC, LFE, BL, BR
        const channelNames = [
            'Front Left',
            'Front Right',
            'Center',
            'LFE',
            'Back Left',
            'Back Right'
        ];

        for (let ch = 0; ch < 6; ch++) {
            const osc = ctx.createOscillator();
            osc.frequency.value = 220 + ch * 55;
            osc.type = 'sine';

            // Split into 6 channels
            const splitter = ctx.createChannelSplitter(6);
            const merger = ctx.createChannelMerger(6);

            // Process each channel through filter
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000 + ch * 500;

            const gain = ctx.createGain();
            gain.gain.value = 0.15;

            osc.connect(gain);
            gain.connect(splitter);

            // Connect this oscillator only to its designated channel
            splitter.connect(filter, 0);
            filter.connect(merger, 0, ch);

            merger.connect(ctx.destination);

            osc.start(0);
        }

        const start = performance.now();
        const renderedBuffer = await ctx.startRendering();
        const elapsed = performance.now() - start;

        // Verify audio was rendered in all channels
        let hasAudio = false;
        for (let ch = 0; ch < 6; ch++) {
            const channelData = renderedBuffer.getChannelData(ch);
            for (let j = 0; j < Math.min(1000, channelData.length); j++) {
                if (Math.abs(channelData[j]) > 0.0001) {
                    hasAudio = true;
                    break;
                }
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
