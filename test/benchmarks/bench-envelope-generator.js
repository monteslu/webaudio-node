/**
 * Benchmark: Envelope Generator (ADSR)
 *
 * Tests ADSR envelopes using AudioParam automation
 * Common use case: Synthesizers, samplers, drum machines
 */

export async function benchmarkEnvelopeGenerator(OfflineAudioContext, iterations = 10) {
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

        // Create 16 notes with ADSR envelopes
        for (let j = 0; j < 16; j++) {
            const startTime = j * 0.05; // Staggered starts
            const noteLength = 0.3;

            const osc = ctx.createOscillator();
            osc.frequency.value = 220 * Math.pow(2, j / 12); // Chromatic scale
            osc.type = 'sawtooth';

            const envelope = ctx.createGain();
            envelope.gain.value = 0;

            // ADSR parameters
            const attackTime = 0.01;
            const decayTime = 0.05;
            const sustainLevel = 0.7;
            const releaseTime = 0.1;

            // Attack
            envelope.gain.setValueAtTime(0, startTime);
            envelope.gain.linearRampToValueAtTime(1.0, startTime + attackTime);

            // Decay
            envelope.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);

            // Sustain (hold at sustainLevel)
            const sustainEnd = startTime + noteLength - releaseTime;
            envelope.gain.setValueAtTime(sustainLevel, sustainEnd);

            // Release
            envelope.gain.linearRampToValueAtTime(0, sustainEnd + releaseTime);

            osc.connect(envelope);
            envelope.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(sustainEnd + releaseTime);
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
