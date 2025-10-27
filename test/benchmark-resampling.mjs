#!/usr/bin/env node

/**
 * Resampling Performance Benchmark
 *
 * Compares resampling performance between webaudio-node (Speex) and node-web-audio-api (Rust/rubato)
 * Tests various sample rate conversions with different audio durations
 */

import { AudioContext } from '../index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to import the Rust implementation for comparison
let RustAudioContext;
try {
    const rustModule = await import('node-web-audio-api');
    RustAudioContext = rustModule.AudioContext;
} catch (err) {
    console.log('⚠️  node-web-audio-api not installed, skipping comparison');
    console.log('   Install with: npm install node-web-audio-api\n');
}

// Test configurations
const TEST_CONFIGS = [
    { name: '44.1kHz → 48kHz (upsampling)', source: 44100, target: 48000 },
    { name: '48kHz → 44.1kHz (downsampling)', source: 48000, target: 44100 },
    { name: '44.1kHz → 96kHz (2x upsampling)', source: 44100, target: 96000 },
    { name: '96kHz → 44.1kHz (2x downsampling)', source: 96000, target: 44100 },
    { name: '22.05kHz → 48kHz (big upsampling)', source: 22050, target: 48000 },
];

const DURATIONS = [1, 5, 10]; // seconds

/**
 * Generate synthetic audio data at a specific sample rate
 */
function generateTestAudio(sampleRate, durationSeconds, channels = 2) {
    const numFrames = sampleRate * durationSeconds;
    const numSamples = numFrames * channels;
    const audioData = new Float32Array(numSamples);

    // Generate a mix of sine waves (simulates real audio complexity)
    const frequencies = [440, 880, 1320]; // A4, A5, E6
    for (let frame = 0; frame < numFrames; frame++) {
        const time = frame / sampleRate;
        let sample = 0;
        for (const freq of frequencies) {
            sample += Math.sin(2 * Math.PI * freq * time) / frequencies.length;
        }
        // Interleave for all channels
        for (let ch = 0; ch < channels; ch++) {
            audioData[frame * channels + ch] = sample * 0.5;
        }
    }

    return audioData;
}

/**
 * Create a fake encoded audio buffer (WAV header + PCM data)
 */
function createFakeWAV(audioData, sampleRate, channels) {
    const numFrames = audioData.length / channels;
    const bytesPerSample = 4; // float32
    const dataSize = audioData.length * bytesPerSample;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    // WAV header (simplified - just enough for decoding)
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(headerSize + dataSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(3, 20); // format: IEEE float
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // byte rate
    buffer.writeUInt16LE(channels * bytesPerSample, 32); // block align
    buffer.writeUInt16LE(32, 34); // bits per sample (32-bit float)
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Copy audio data
    for (let i = 0; i < audioData.length; i++) {
        buffer.writeFloatLE(audioData[i], headerSize + i * bytesPerSample);
    }

    return buffer;
}

/**
 * Benchmark a single resampling operation
 */
async function benchmarkResample(impl, sourceSampleRate, targetSampleRate, duration) {
    const channels = 2;

    // Generate test audio at source sample rate
    const audioData = generateTestAudio(sourceSampleRate, duration, channels);
    const wavBuffer = createFakeWAV(audioData, sourceSampleRate, channels);

    // Create context at target sample rate
    const ctx = new impl({ sampleRate: targetSampleRate });

    // Measure decode + resample time
    const startTime = performance.now();
    const decodedBuffer = await ctx.decodeAudioData(wavBuffer.buffer);
    const endTime = performance.now();

    await ctx.close();

    const elapsedMs = endTime - startTime;
    const inputFrames = sourceSampleRate * duration;
    const outputFrames = targetSampleRate * duration;
    const speedupVsRealtime = (duration * 1000) / elapsedMs;

    return {
        elapsedMs,
        inputFrames,
        outputFrames,
        speedupVsRealtime,
        inputSampleRate: decodedBuffer.sampleRate === targetSampleRate ? sourceSampleRate : decodedBuffer.sampleRate,
        outputSampleRate: decodedBuffer.sampleRate,
    };
}

/**
 * Run benchmark suite
 */
async function runBenchmarks() {
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║     Resampling Performance Benchmark - Speex vs Rust/rubato      ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    const results = {};

    for (const config of TEST_CONFIGS) {
        console.log(`\n📊 ${config.name}`);
        console.log('═'.repeat(70));

        results[config.name] = {};

        for (const duration of DURATIONS) {
            console.log(`\n🎵 Duration: ${duration}s`);

            // Benchmark webaudio-node (Speex)
            const ourResult = await benchmarkResample(AudioContext, config.source, config.target, duration);
            console.log(`   webaudio-node (Speex):     ${ourResult.elapsedMs.toFixed(2)}ms  (${ourResult.speedupVsRealtime.toFixed(1)}x realtime)`);

            results[config.name][`${duration}s`] = { ours: ourResult };

            // Benchmark Rust implementation if available
            if (RustAudioContext) {
                const rustResult = await benchmarkResample(RustAudioContext, config.source, config.target, duration);
                console.log(`   node-web-audio-api (Rust): ${rustResult.elapsedMs.toFixed(2)}ms  (${rustResult.speedupVsRealtime.toFixed(1)}x realtime)`);

                results[config.name][`${duration}s`].rust = rustResult;

                // Calculate speedup
                const speedup = rustResult.elapsedMs / ourResult.elapsedMs;
                const winner = speedup > 1 ? 'SPEEX WINS!' : 'Rust wins';
                const emoji = speedup > 1 ? '🚀' : '🐢';
                console.log(`   ${emoji} Speedup: ${speedup.toFixed(2)}x ${winner}`);
            }
        }
    }

    // Summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                         SUMMARY                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    if (RustAudioContext) {
        let speexWins = 0;
        let rustWins = 0;
        let totalSpeedup = 0;
        let count = 0;

        for (const [configName, durationResults] of Object.entries(results)) {
            for (const [duration, result] of Object.entries(durationResults)) {
                if (result.rust) {
                    const speedup = result.rust.elapsedMs / result.ours.elapsedMs;
                    totalSpeedup += speedup;
                    count++;

                    if (speedup > 1) {
                        speexWins++;
                    } else {
                        rustWins++;
                    }
                }
            }
        }

        const avgSpeedup = totalSpeedup / count;
        const winRate = (speexWins / count * 100).toFixed(1);

        console.log(`📈 Results: Speex won ${speexWins}/${count} tests (${winRate}% win rate)`);
        console.log(`⚡ Average speedup: ${avgSpeedup.toFixed(2)}x ${avgSpeedup > 1 ? 'faster' : 'slower'} than Rust\n`);

        if (avgSpeedup > 1) {
            console.log('🎉 VICTORY! Speex resampler is faster than Rust/rubato on average!');
        } else {
            console.log('💪 Competitive performance with Rust implementation!');
        }
    } else {
        console.log('ℹ️  Install node-web-audio-api to compare with Rust implementation');
    }

    console.log('\n📝 Notes:');
    console.log('   - Speex quality level: 3 (desktop quality)');
    console.log('   - SIMD optimizations enabled (-msimd128)');
    console.log('   - Times include both decoding and resampling');
    console.log('   - Higher speedup = faster performance\n');
}

// Run benchmarks
runBenchmarks().catch(console.error);
