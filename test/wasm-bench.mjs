// Benchmark WASM vs Native backend performance

import { WasmOfflineAudioContext } from '../src/wasm-integration/WasmOfflineAudioContext.js';
import { OfflineAudioContext } from '../src/javascript/OfflineAudioContext.js';

async function benchmarkWASM() {
    const sampleRate = 44100;
    const duration = 10; // 10 seconds
    const context = new WasmOfflineAudioContext({
        numberOfChannels: 2,
        length: sampleRate * duration,
        sampleRate: sampleRate,
    });

    const oscillator = await context.createOscillator();
    const gain = await context.createGain();

    oscillator.frequency.value = 440;
    gain.gain.value = 0.5;

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(0);

    const start = Date.now();
    await context.startRendering();
    const elapsed = Date.now() - start;

    context.close();

    return {
        backend: 'WASM',
        duration: duration,
        elapsed: elapsed,
        samplesPerSecond: (sampleRate * duration) / (elapsed / 1000),
        realtimeFactor: (duration * 1000) / elapsed
    };
}

async function benchmarkNative() {
    const sampleRate = 44100;
    const duration = 10; // 10 seconds
    const context = new OfflineAudioContext({
        numberOfChannels: 2,
        length: sampleRate * duration,
        sampleRate: sampleRate,
    });

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.frequency.value = 440;
    gain.gain.value = 0.5;

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(0);

    const start = Date.now();
    await context.startRendering();
    const elapsed = Date.now() - start;

    context.close();

    return {
        backend: 'Native C++',
        duration: duration,
        elapsed: elapsed,
        samplesPerSecond: (sampleRate * duration) / (elapsed / 1000),
        realtimeFactor: (duration * 1000) / elapsed
    };
}

async function main() {
    console.log('🏁 WebAudio Backend Performance Comparison\n');
    console.log('━'.repeat(60));
    console.log('Test: Oscillator → Gain → Destination');
    console.log(`Duration: 10 seconds of audio`);
    console.log(`Sample Rate: 44100 Hz`);
    console.log(`Channels: 2 (stereo)`);
    console.log('━'.repeat(60));
    console.log('');

    // Warm up
    console.log('Warming up...');
    await benchmarkNative();
    await benchmarkWASM();
    console.log('');

    // Run benchmarks
    console.log('Running benchmarks...\n');

    const wasmResults = await benchmarkWASM();
    console.log(`✅ WASM Backend:`);
    console.log(`   Render Time: ${wasmResults.elapsed}ms`);
    console.log(`   Throughput: ${(wasmResults.samplesPerSecond / 1e6).toFixed(2)}M samples/sec`);
    console.log(`   Realtime Factor: ${wasmResults.realtimeFactor.toFixed(1)}x`);
    console.log('');

    const nativeResults = await benchmarkNative();
    console.log(`✅ Native C++ Backend:`);
    console.log(`   Render Time: ${nativeResults.elapsed}ms`);
    console.log(`   Throughput: ${(nativeResults.samplesPerSecond / 1e6).toFixed(2)}M samples/sec`);
    console.log(`   Realtime Factor: ${nativeResults.realtimeFactor.toFixed(1)}x`);
    console.log('');

    console.log('━'.repeat(60));
    const speedup = nativeResults.elapsed / wasmResults.elapsed;
    if (speedup > 1) {
        console.log(`🚀 WASM is ${speedup.toFixed(2)}x FASTER than Native!`);
    } else {
        console.log(`⚡ Native is ${(1/speedup).toFixed(2)}x faster than WASM`);
    }
    const overhead = ((wasmResults.elapsed / nativeResults.elapsed - 1) * 100);
    if (overhead > 0) {
        console.log(`   WASM overhead: ${overhead.toFixed(1)}%`);
    } else {
        console.log(`   WASM improvement: ${(-overhead).toFixed(1)}%`);
    }
    console.log('━'.repeat(60));
}

main().catch(console.error);
