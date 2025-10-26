// WaveShaper WASM vs Native Performance Benchmark
// Phase 1 Proof of Concept

import { performance } from 'perf_hooks';
import createWaveShaperModule from '../dist/wave_shaper_poc.mjs';

async function runBenchmark() {
    console.log('WaveShaper WASM Performance Benchmark\n');
    console.log('Loading WASM module...');

    const wasm = await createWaveShaperModule();
    console.log('✅ WASM module loaded\n');

    // Test parameters (matching webaudio-benchmarks)
    const sampleRate = 48000;
    const channels = 2;
    const frameCount = 128;  // Standard render quantum
    const iterations = 10000; // Run many times for reliable measurement

    // Create WaveShaper
    const shaperPtr = wasm._createWaveShaper(sampleRate, channels);

    // Create curve (1024 points, typical size)
    const curveLength = 1024;
    const curvePtr = wasm._malloc(curveLength * 4); // 4 bytes per float
    const curveView = new Float32Array(wasm.HEAPF32.buffer, curvePtr, curveLength);

    // Generate curve data (soft clipping curve)
    for (let i = 0; i < curveLength; i++) {
        const x = (i / (curveLength - 1)) * 2 - 1; // Map to [-1, 1]
        curveView[i] = Math.tanh(x * 3) / Math.tanh(3); // Soft clip
    }

    // Set curve
    wasm._setCurve(shaperPtr, curvePtr, curveLength);

    // Create audio buffer
    const totalSamples = frameCount * channels;
    const bufferPtr = wasm._malloc(totalSamples * 4);
    const bufferView = new Float32Array(wasm.HEAPF32.buffer, bufferPtr, totalSamples);

    // Fill with test signal (sine wave)
    for (let i = 0; i < totalSamples; i++) {
        bufferView[i] = Math.sin(i * 0.1) * 0.8; // 80% amplitude sine
    }

    console.log('Benchmark Parameters:');
    console.log(`  Sample Rate: ${sampleRate} Hz`);
    console.log(`  Channels: ${channels}`);
    console.log(`  Frame Count: ${frameCount} frames`);
    console.log(`  Curve Length: ${curveLength} points`);
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Total Samples: ${totalSamples} per iteration`);
    console.log('');

    // Warm-up (ensure JIT compilation)
    console.log('Warming up...');
    for (let i = 0; i < 100; i++) {
        wasm._processWaveShaper(shaperPtr, bufferPtr, frameCount);
    }
    console.log('✅ Warm-up complete\n');

    // Benchmark
    console.log('Running benchmark...');
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        wasm._processWaveShaper(shaperPtr, bufferPtr, frameCount);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    const samplesPerSecond = (totalSamples * iterations) / (totalTime / 1000);

    console.log('\n📊 WASM Performance Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Time:          ${totalTime.toFixed(2)} ms`);
    console.log(`Avg Time/Iteration:  ${(avgTime * 1000).toFixed(2)} µs`);
    console.log(`Samples/Second:      ${(samplesPerSecond / 1e6).toFixed(2)} million`);
    console.log(`Processing Speed:    ${(samplesPerSecond / sampleRate).toFixed(1)}x realtime`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify output is valid (not all zeros)
    const outputSum = bufferView.reduce((sum, val) => sum + Math.abs(val), 0);
    console.log(`Output Validation:   ${outputSum > 0 ? '✅ PASS' : '❌ FAIL'} (sum: ${outputSum.toFixed(2)})`);

    // Cleanup
    wasm._destroyWaveShaper(shaperPtr);
    wasm._free(curvePtr);
    wasm._free(bufferPtr);

    console.log('\n✅ Benchmark complete!');

    // Reference comparison
    console.log('\n📈 Performance Context:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('For comparison with native performance:');
    console.log('  Current ARM NEON WaveShaper (4x oversample): ~2.01ms per render');
    console.log('  Target: WASM should be within 2-3x of native (4-6ms acceptable)');
    console.log('  Status: Will be validated in full benchmark suite');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runBenchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});
