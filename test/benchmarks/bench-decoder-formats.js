// Audio Decoder Format Benchmark
// Compares WASM decoders vs Rust decoders for all formats: MP3, WAV, FLAC, OGG, AAC

import { readFile } from 'fs/promises';
import { AudioContext as RustAudioContext } from 'node-web-audio-api';
import { WasmAudioDecoders } from '../../src/wasm-integration/WasmAudioDecoders.js';

const WARMUP_ITERATIONS = 5;
const BENCH_ITERATIONS = 50;

async function benchmarkDecoder(name, decodeFunc, audioData) {
    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        try {
            await decodeFunc(audioData);
        } catch (e) {
            // Skip warmup errors
        }
    }

    // Benchmark
    const times = [];
    for (let i = 0; i < BENCH_ITERATIONS; i++) {
        const start = performance.now();
        try {
            await decodeFunc(audioData);
            const end = performance.now();
            times.push(end - start);
        } catch (e) {
            console.error(`  Error in ${name}:`, e.message);
            return null;
        }
    }

    if (times.length === 0) return null;

    times.sort((a, b) => a - b);
    const min = times[0];
    const max = times[times.length - 1];
    const median = times[Math.floor(times.length / 2)];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = times[Math.floor(times.length * 0.95)];

    return { name, min, max, median, avg, p95, times };
}

async function benchmarkFormat(formatName, fileName, wasmDecoder) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${formatName} Decoding Benchmark`);
    console.log('='.repeat(60));

    // Load test file
    const filePath = `./${fileName}`;
    const fileData = await readFile(filePath);
    const fileSize = (fileData.length / 1024).toFixed(1);
    console.log(`Test file: ${filePath}`);
    console.log(`File size: ${fileSize} KB`);
    console.log(`Iterations: ${WARMUP_ITERATIONS} warmup + ${BENCH_ITERATIONS} benchmark\n`);

    // WASM decoder
    console.log('Testing WASM decoder...');
    const wasmResults = await benchmarkDecoder(
        'WASM',
        async data => {
            return await wasmDecoder(data.buffer);
        },
        fileData
    );

    if (!wasmResults) {
        console.log('WASM decoder failed, skipping Rust comparison');
        return;
    }

    // Rust decoder
    console.log('Testing Rust decoder...');
    const rustContext = new RustAudioContext({ sampleRate: 44100 });
    const rustResults = await benchmarkDecoder(
        'Rust',
        async data => {
            return await rustContext.decodeAudioData(data.buffer);
        },
        fileData
    );
    rustContext.close();

    if (!rustResults) {
        console.log('Rust decoder failed, showing WASM results only');
        console.log(`\n${wasmResults.name}:`);
        console.log(`  Min:    ${wasmResults.min.toFixed(3)} ms`);
        console.log(`  Median: ${wasmResults.median.toFixed(3)} ms`);
        console.log(`  Avg:    ${wasmResults.avg.toFixed(3)} ms`);
        console.log(`  P95:    ${wasmResults.p95.toFixed(3)} ms`);
        console.log(`  Max:    ${wasmResults.max.toFixed(3)} ms`);
        return;
    }

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
        console.log(`✓ WASM is ${speedup.toFixed(2)}x faster than Rust (median)`);
    } else {
        console.log(`  Rust is ${(1 / speedup).toFixed(2)}x faster than WASM (median)`);
    }

    const avgSpeedup = rustResults.avg / wasmResults.avg;
    if (avgSpeedup > 1) {
        console.log(`✓ WASM is ${avgSpeedup.toFixed(2)}x faster than Rust (average)`);
    } else {
        console.log(`  Rust is ${(1 / avgSpeedup).toFixed(2)}x faster than WASM (average)`);
    }
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('Audio Decoder Format Benchmark Suite');
    console.log('='.repeat(60));

    const formats = [
        {
            name: 'MP3',
            file: 'rising_sun.mp3',
            decoder: WasmAudioDecoders.decodeMP3.bind(WasmAudioDecoders)
        },
        {
            name: 'WAV',
            file: 'rising_sun.wav',
            decoder: WasmAudioDecoders.decodeWAV.bind(WasmAudioDecoders)
        },
        {
            name: 'FLAC',
            file: 'rising_sun.flac',
            decoder: WasmAudioDecoders.decodeFLAC.bind(WasmAudioDecoders)
        },
        {
            name: 'OGG/Vorbis',
            file: 'rising_sun.ogg',
            decoder: WasmAudioDecoders.decodeVorbis.bind(WasmAudioDecoders)
        },
        {
            name: 'AAC',
            file: 'rising_sun.aac',
            decoder: WasmAudioDecoders.decodeAAC.bind(WasmAudioDecoders)
        }
    ];

    for (const format of formats) {
        try {
            await benchmarkFormat(format.name, format.file, format.decoder);
        } catch (err) {
            console.error(`\nError benchmarking ${format.name}:`, err.message);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Benchmark Complete!');
    console.log('='.repeat(60) + '\n');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
