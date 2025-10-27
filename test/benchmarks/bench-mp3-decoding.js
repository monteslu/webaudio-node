// MP3 Decoding Benchmark
// Compares WASM decoder vs Rust decoder performance

import { readFile } from 'fs/promises';
import { AudioContext as RustAudioContext } from 'node-web-audio-api';
import { WasmAudioDecoders } from '../../src/wasm-integration/WasmAudioDecoders.js';

const WARMUP_ITERATIONS = 5;
const BENCH_ITERATIONS = 50;

async function benchmarkDecoder(name, decodeFunc, mp3Data) {
    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        await decodeFunc(mp3Data);
    }

    // Benchmark
    const times = [];
    for (let i = 0; i < BENCH_ITERATIONS; i++) {
        const start = performance.now();
        await decodeFunc(mp3Data);
        const end = performance.now();
        times.push(end - start);
    }

    times.sort((a, b) => a - b);
    const min = times[0];
    const max = times[times.length - 1];
    const median = times[Math.floor(times.length / 2)];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = times[Math.floor(times.length * 0.95)];

    return { name, min, max, median, avg, p95, times };
}

async function main() {
    console.log('MP3 Decoding Benchmark');
    console.log('======================\n');

    // Load test MP3 file
    const mp3Path = './rising_sun.mp3';
    const mp3Data = await readFile(mp3Path);
    const mp3Size = (mp3Data.length / 1024).toFixed(1);
    console.log(`Test file: ${mp3Path}`);
    console.log(`File size: ${mp3Size} KB`);
    console.log(`Warmup iterations: ${WARMUP_ITERATIONS}`);
    console.log(`Benchmark iterations: ${BENCH_ITERATIONS}\n`);

    // WASM decoder
    console.log('Testing WASM decoder...');
    const wasmResults = await benchmarkDecoder(
        'WASM',
        async data => {
            return await WasmAudioDecoders.decodeMP3(data.buffer);
        },
        mp3Data
    );

    // Rust decoder
    console.log('Testing Rust decoder...');
    const rustContext = new RustAudioContext({ sampleRate: 44100 });
    const rustResults = await benchmarkDecoder(
        'Rust',
        async data => {
            return await rustContext.decodeAudioData(data.buffer);
        },
        mp3Data
    );

    // Print results
    console.log('\nResults:');
    console.log('--------');

    const results = [wasmResults, rustResults];
    for (const result of results) {
        console.log(`\n${result.name}:`);
        console.log(`  Min:    ${result.min.toFixed(3)} ms`);
        console.log(`  Median: ${result.median.toFixed(3)} ms`);
        console.log(`  Avg:    ${result.avg.toFixed(3)} ms`);
        console.log(`  P95:    ${result.p95.toFixed(3)} ms`);
        console.log(`  Max:    ${result.max.toFixed(3)} ms`);
    }

    // Compare
    console.log('\nComparison:');
    console.log('-----------');
    const speedup = rustResults.median / wasmResults.median;
    if (speedup > 1) {
        console.log(`WASM is ${speedup.toFixed(2)}x faster than Rust (median)`);
    } else {
        console.log(`Rust is ${(1 / speedup).toFixed(2)}x faster than WASM (median)`);
    }

    const avgSpeedup = rustResults.avg / wasmResults.avg;
    if (avgSpeedup > 1) {
        console.log(`WASM is ${avgSpeedup.toFixed(2)}x faster than Rust (average)`);
    } else {
        console.log(`Rust is ${(1 / avgSpeedup).toFixed(2)}x faster than WASM (average)`);
    }

    rustContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
