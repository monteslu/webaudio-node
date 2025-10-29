/**
 * Benchmark: MP3 Decode
 *
 * Tests MP3 decoding performance in isolation
 * This isolates decode performance from processing
 */

import { readFileSync } from 'fs';

export async function benchmarkMP3Decode(AudioContext, mp3Path, iterations = 5) {
    // Load MP3 file
    const mp3Data = readFileSync(mp3Path);

    const times = [];

    for (let i = 0; i < iterations; i++) {
        // Create a temporary AudioContext for decoding
        const ctx = new AudioContext({ sampleRate: 48000 });

        // Measure decode time
        const decodeStart = performance.now();

        if (ctx.resume) await ctx.resume();
        const audioBuffer = await ctx.decodeAudioData(
            mp3Data.buffer.slice(mp3Data.byteOffset, mp3Data.byteOffset + mp3Data.byteLength)
        );
        if (ctx.close) await ctx.close();

        const decodeTime = performance.now() - decodeStart;
        times.push(decodeTime);

        // Verify buffer was decoded
        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error('Failed to decode audio buffer');
        }
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);

    return {
        avgTimeMs: avgTime,
        minTimeMs: minTime,
        iterations: iterations
    };
}
