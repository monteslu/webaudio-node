// FFT WASM Performance Benchmark
import { performance } from 'perf_hooks';
import createFFTModule from '../dist/fft.mjs';

async function runBenchmark() {
    console.log('FFT WASM Performance Benchmark\n');

    const wasm = await createFFTModule();
    console.log('✅ FFT WASM module loaded\n');

    // Test FFT sizes (power of 4 sizes win big in native version)
    const fftSizes = [256, 512, 1024, 2048, 4096];
    const iterations = 1000;

    for (const fftSize of fftSizes) {
        console.log(`\n━━━━ FFT Size: ${fftSize} ━━━━`);

        // Create FFT
        const fftPtr = wasm._createFFT(fftSize);

        // Allocate input (real)
        const inputPtr = wasm._malloc(fftSize * 4);
        const inputView = new Float32Array(wasm.HEAPF32.buffer, inputPtr, fftSize);

        // Fill with test signal (sum of sines)
        for (let i = 0; i < fftSize; i++) {
            inputView[i] = Math.sin(i * 0.1) + Math.sin(i * 0.05) * 0.5;
        }

        // Allocate output (complex: 2 floats per bin)
        const outputPtr = wasm._malloc(fftSize * 2 * 4);

        // Allocate magnitude output
        const magnitudePtr = wasm._malloc(fftSize * 4);

        // Warm-up
        for (let i = 0; i < 10; i++) {
            wasm._forwardFFT(fftPtr, inputPtr, outputPtr);
            wasm._getMagnitude(outputPtr, magnitudePtr, fftSize);
        }

        // Benchmark Forward FFT + Magnitude
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            wasm._forwardFFT(fftPtr, inputPtr, outputPtr);
            wasm._getMagnitude(outputPtr, magnitudePtr, fftSize);
        }
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;

        console.log(`  Iterations: ${iterations}`);
        console.log(`  Total Time: ${totalTime.toFixed(2)} ms`);
        console.log(`  Avg/Iteration: ${(avgTime * 1000).toFixed(2)} µs`);
        console.log(`  Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} FFTs/second`);

        // Cleanup
        wasm._destroyFFT(fftPtr);
        wasm._free(inputPtr);
        wasm._free(outputPtr);
        wasm._free(magnitudePtr);
    }

    console.log('\n✅ FFT benchmark complete!\n');
    console.log('📈 Reference (Native ARM NEON):');
    console.log('  FFT 512:  0.54ms (51% faster than Rust)');
    console.log('  FFT 4096: 0.54ms (170% faster than Rust)');
    console.log('\nWASM target: Within 2-3x of native acceptable\n');
}

runBenchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});
