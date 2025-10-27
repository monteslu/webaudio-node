import { benchmarkOfflineRendering } from './bench-offline-rendering.js';
import { benchmarkMixing } from './bench-mixing.js';
import { benchmarkAutomation } from './bench-automation.js';
import { benchmarkMemory } from './bench-memory.js';
import { benchmarkMP3Processing } from './bench-mp3-processing.js';
import { benchmarkDelay } from './bench-delay.js';
import { benchmarkWaveShaper } from './bench-waveshaper.js';
import { benchmarkComplexGraph } from './bench-complex-graph.js';
import { benchmarkFilterChain } from './bench-filter-chain.js';
import { benchmarkChannelOps } from './bench-channel-ops.js';
import { benchmarkNodeCreation } from './bench-node-creation.js';
import { benchmarkConvolver } from './bench-convolver.js';
import { benchmarkCompressor } from './bench-compressor.js';
import { benchmarkStereoPanner } from './bench-stereo-panner.js';
import { benchmarkBufferPlayback } from './bench-buffer-playback.js';
import { benchmarkAnalyser } from './bench-analyser.js';
import { benchmarkOscillators } from './bench-oscillators.js';
import { benchmarkIIRFilter } from './bench-iir-filter.js';
import { benchmark3DPanner } from './bench-3d-panner.js';
import { benchmarkHeavyProcessing } from './bench-heavy-processing.js';
import { benchmarkStressTest } from './bench-stress-test.js';
import { benchmarkConstantSource } from './bench-constant-source.js';
import { benchmarkGainRamping } from './bench-gain-ramping.js';
import { benchmarkPeriodicWave } from './bench-periodic-wave.js';
import { benchmarkDelayModulation } from './bench-delay-modulation.js';
import { benchmarkFilterModulation } from './bench-filter-modulation.js';
import { benchmarkEnvelopeGenerator } from './bench-envelope-generator.js';
import { benchmarkRingModulation } from './bench-ring-modulation.js';
import { benchmarkGranularSynthesis } from './bench-granular-synthesis.js';
import { benchmarkFilterTypes } from './bench-filter-types.js';
import { benchmarkMultichannel } from './bench-multichannel.js';
import { benchmarkSampleRates } from './bench-sample-rates.js';
import { benchmarkChannelCounts } from './bench-channel-counts.js';
import { benchmarkAudioListener } from './bench-audio-listener.js';
import { benchmarkDistanceModels } from './bench-distance-models.js';
import { benchmarkOversampling } from './bench-oversampling.js';
import { benchmarkAnalyserProcessOverhead } from './bench-fft-sizes.js';
import { benchmarkImpulseSizes } from './bench-impulse-sizes.js';

let implementations = [];

// Load webaudio-node NATIVE
try {
    const webaudioNode = await import('webaudio-node');
    implementations.push({
        name: 'webaudio-node (Native C++)',
        OfflineAudioContext: webaudioNode.OfflineAudioContext,
        AudioContext: webaudioNode.AudioContext,
        color: '\x1b[32m' // Green
    });
    console.log('✓ Loaded webaudio-node (Native C++)');
} catch (e) {
    console.log('✗ Failed to load webaudio-node:', e.message);
}

// Load webaudio-node WASM
try {
    const webaudioWasm = await import('webaudio-node/index-wasm.js');
    implementations.push({
        name: 'webaudio-node (WASM)',
        OfflineAudioContext: webaudioWasm.OfflineAudioContext,
        AudioContext: webaudioWasm.AudioContext,
        color: '\x1b[36m' // Cyan
    });
    console.log('✓ Loaded webaudio-node (WASM)');
} catch (e) {
    console.log('✗ Failed to load webaudio-node WASM:', e.message);
}

// Load node-web-audio-api (Rust competitor)
try {
    const nodeWebAudio = await import('node-web-audio-api');
    implementations.push({
        name: 'node-web-audio-api (Rust)',
        OfflineAudioContext: nodeWebAudio.OfflineAudioContext,
        AudioContext: nodeWebAudio.AudioContext,
        color: '\x1b[34m' // Blue
    });
    console.log('✓ Loaded node-web-audio-api (Rust)');
} catch (e) {
    console.log('✗ Failed to load node-web-audio-api:', e.message);
}

if (implementations.length === 0) {
    console.error('\n❌ No implementations loaded.');
    process.exit(1);
}

console.log(`\n📊 Running benchmarks on ${implementations.length} implementation(s)...\n`);

const reset = '\x1b[0m';
const bold = '\x1b[1m';

function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
}

function printHeader(title) {
    console.log(`\n${bold}═══ ${title} ═══${reset}\n`);
}

// Run benchmarks
const allBenchmarks = [
    { name: 'Offline Rendering (10s)', fn: ctx => benchmarkOfflineRendering(ctx, 10) },
    { name: 'Mixing (100 oscillators)', fn: ctx => benchmarkMixing(ctx, 100, 5) },
    { name: 'Automation', fn: ctx => benchmarkAutomation(ctx, 5) },
    { name: 'Memory', fn: ctx => benchmarkMemory(ctx, 100) },
    { name: 'Delay', fn: ctx => benchmarkDelay(ctx, 5) },
    { name: 'WaveShaper', fn: ctx => benchmarkWaveShaper(ctx, 5) },
    { name: 'Complex Graph', fn: ctx => benchmarkComplexGraph(ctx, 5) },
    { name: 'Filter Chain', fn: ctx => benchmarkFilterChain(ctx, 5) },
    { name: 'Channel Ops', fn: ctx => benchmarkChannelOps(ctx, 5) },
    { name: 'Node Creation', fn: ctx => benchmarkNodeCreation(ctx) },
    { name: 'Convolver', fn: ctx => benchmarkConvolver(ctx, 5) },
    { name: 'Compressor', fn: ctx => benchmarkCompressor(ctx, 5) },
    { name: 'Stereo Panner', fn: ctx => benchmarkStereoPanner(ctx, 5) },
    { name: 'Buffer Playback', fn: ctx => benchmarkBufferPlayback(ctx, 5) },
    { name: 'Analyser', fn: ctx => benchmarkAnalyser(ctx, 5) },
    { name: 'Oscillators', fn: ctx => benchmarkOscillators(ctx, 5) },
    { name: 'IIR Filter', fn: ctx => benchmarkIIRFilter(ctx, 5) },
    { name: '3D Panner', fn: ctx => benchmark3DPanner(ctx, 5) },
    { name: 'Heavy Processing', fn: ctx => benchmarkHeavyProcessing(ctx, 3) },
    { name: 'Stress Test', fn: ctx => benchmarkStressTest(ctx, 3) },
    { name: 'Constant Source', fn: ctx => benchmarkConstantSource(ctx, 5) },
    { name: 'Gain Ramping', fn: ctx => benchmarkGainRamping(ctx, 5) },
    { name: 'Periodic Wave', fn: ctx => benchmarkPeriodicWave(ctx, 5) },
    { name: 'Delay Modulation', fn: ctx => benchmarkDelayModulation(ctx, 5) },
    { name: 'Filter Modulation', fn: ctx => benchmarkFilterModulation(ctx, 5) },
    { name: 'Envelope Generator', fn: ctx => benchmarkEnvelopeGenerator(ctx, 5) },
    { name: 'Ring Modulation', fn: ctx => benchmarkRingModulation(ctx, 5) },
    { name: 'Granular Synthesis', fn: ctx => benchmarkGranularSynthesis(ctx, 5) },
    { name: 'Filter Types', fn: ctx => benchmarkFilterTypes(ctx, 5) },
    { name: 'Multichannel', fn: ctx => benchmarkMultichannel(ctx, 5) },
    { name: 'Sample Rates', fn: ctx => benchmarkSampleRates(ctx, 3) },
    { name: 'Channel Counts', fn: ctx => benchmarkChannelCounts(ctx, 3) },
    { name: 'Audio Listener', fn: ctx => benchmarkAudioListener(ctx, 5) },
    { name: 'Distance Models', fn: ctx => benchmarkDistanceModels(ctx, 5) },
    { name: 'Oversampling', fn: ctx => benchmarkOversampling(ctx, 5) },
    { name: 'FFT Sizes', fn: ctx => benchmarkAnalyserProcessOverhead(ctx, 5) },
    { name: 'Impulse Sizes', fn: ctx => benchmarkImpulseSizes(ctx, 3) }
];

const results = {};

for (const impl of implementations) {
    console.log(`\n${impl.color}${bold}Testing ${impl.name}...${reset}`);
    results[impl.name] = {};

    for (const bench of allBenchmarks) {
        try {
            console.log(`  Running ${bench.name}...`);
            const result = await bench.fn(impl.OfflineAudioContext);
            results[impl.name][bench.name] = result;
        } catch (e) {
            console.log(`  ✗ ${bench.name} failed: ${e.message}`);
            results[impl.name][bench.name] = null;
        }
    }
}

// Print comparison table
printHeader('Performance Comparison');

console.log('\nRender Times (lower is better):');
console.log('─'.repeat(80));

for (const bench of allBenchmarks) {
    console.log(`\n${bold}${bench.name}${reset}`);

    const times = implementations.map(impl => {
        const result = results[impl.name][bench.name];
        return result ? result.avgTimeMs : null;
    });

    implementations.forEach((impl, i) => {
        const time = times[i];
        if (time !== null && time !== undefined) {
            const fastest = Math.min(...times.filter(t => t !== null && t !== undefined));
            const slowdown = time / fastest;
            const symbol = slowdown === 1.0 ? '🏆' : slowdown < 1.5 ? '✓' : ' ';
            console.log(
                `  ${symbol} ${impl.color}${impl.name}${reset}: ${time.toFixed(2)}ms ${slowdown > 1.0 ? `(${slowdown.toFixed(2)}x slower)` : ''}`
            );
        } else {
            console.log(`    ${impl.color}${impl.name}${reset}: FAILED`);
        }
    });
}

// Win count
printHeader('Win Count Summary');
const winCounts = {};
implementations.forEach(impl => (winCounts[impl.name] = 0));

for (const bench of allBenchmarks) {
    const times = implementations.map(impl => {
        const result = results[impl.name][bench.name];
        return result ? result.avgTimeMs : Infinity;
    });

    const minTime = Math.min(...times);
    const winnerIdx = times.indexOf(minTime);
    if (winnerIdx >= 0) {
        winCounts[implementations[winnerIdx].name]++;
    }
}

implementations.forEach(impl => {
    const pct = ((winCounts[impl.name] / allBenchmarks.length) * 100).toFixed(1);
    console.log(
        `${impl.color}${impl.name}${reset}: ${winCounts[impl.name]}/${allBenchmarks.length} wins (${pct}%)`
    );
});

console.log('\n✅ Benchmark complete!\n');
