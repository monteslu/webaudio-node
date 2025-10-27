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

// Prevent unhandled rejections from crashing
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️  Unhandled rejection:', reason);
});

// Import implementations
let implementations = [];

// Try to load node-web-audio-api FIRST (test if order matters)
try {
    const nodeWebAudio = await import('node-web-audio-api');
    implementations.push({
        name: 'node-web-audio-api',
        OfflineAudioContext: nodeWebAudio.OfflineAudioContext,
        AudioContext: nodeWebAudio.AudioContext,
        color: '\x1b[34m' // Blue
    });
    console.log('✓ Loaded node-web-audio-api');
} catch (e) {
    console.log('✗ Failed to load node-web-audio-api:', e.message);
}

// Try to load webaudio-node (local)
try {
    const webaudioNode = await import('../../index.js');
    implementations.push({
        name: 'webaudio-node',
        OfflineAudioContext: webaudioNode.OfflineAudioContext,
        AudioContext: webaudioNode.AudioContext,
        color: '\x1b[32m' // Green
    });
    console.log('✓ Loaded webaudio-node (local)');
} catch (e) {
    console.log('✗ Failed to load webaudio-node:', e.message);
}

if (implementations.length === 0) {
    console.error('\n❌ No implementations loaded. Install dependencies and link webaudio-node.');
    process.exit(1);
}

console.log(`\n📊 Running benchmarks on ${implementations.length} implementation(s)...\n`);

const reset = '\x1b[0m';
const bold = '\x1b[1m';

function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function printHeader(title) {
    console.log(`\n${bold}═══ ${title} ═══${reset}\n`);
}

function printTable(headers, rows) {
    const colWidths = headers.map((h, i) => {
        const maxDataWidth = Math.max(...rows.map(r => String(r[i]).length));
        return Math.max(h.length, maxDataWidth) + 2;
    });

    const printRow = (cells, isBold = false) => {
        const formatted = cells
            .map((cell, i) => {
                const str = String(cell);
                return str.padEnd(colWidths[i]);
            })
            .join('│ ');
        console.log((isBold ? bold : '') + '│ ' + formatted + '│' + reset);
    };

    const printSeparator = () => {
        console.log('├─' + colWidths.map(w => '─'.repeat(w)).join('┼─') + '┤');
    };

    console.log('┌─' + colWidths.map(w => '─'.repeat(w)).join('┬─') + '┐');
    printRow(headers, true);
    printSeparator();
    rows.forEach(row => printRow(row));
    console.log('└─' + colWidths.map(w => '─'.repeat(w)).join('┴─') + '┘');
}

// Run benchmarks
const results = {};

for (const impl of implementations) {
    console.log(`\n${impl.color}${bold}Testing ${impl.name}...${reset}`);
    results[impl.name] = {};

    try {
        console.log('  Running offline rendering benchmark...');
        results[impl.name].offline = await benchmarkOfflineRendering(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Offline rendering failed: ${e.message}`);
        results[impl.name].offline = null;
    }

    try {
        console.log('  Running mixing benchmark...');
        results[impl.name].mixing = await benchmarkMixing(impl.OfflineAudioContext, 100, 5);
    } catch (e) {
        console.log(`  ✗ Mixing failed: ${e.message}`);
        results[impl.name].mixing = null;
    }

    try {
        console.log('  Running automation benchmark...');
        results[impl.name].automation = await benchmarkAutomation(
            impl.OfflineAudioContext,
            1000,
            5
        );
    } catch (e) {
        console.log(`  ✗ Automation failed: ${e.message}`);
        results[impl.name].automation = null;
    }

    try {
        console.log('  Running memory benchmark...');
        results[impl.name].memory = await benchmarkMemory(impl.OfflineAudioContext, 100);
    } catch (e) {
        console.log(`  ✗ Memory failed: ${e.message}`);
        results[impl.name].memory = null;
    }

    try {
        console.log('  Running MP3 processing benchmark...');
        results[impl.name].mp3 = await benchmarkMP3Processing(
            impl.AudioContext,
            impl.OfflineAudioContext,
            'test-audio.mp3',
            5
        );
    } catch (e) {
        console.log(`  ✗ MP3 processing failed: ${e.message}`);
        results[impl.name].mp3 = null;
    }

    try {
        console.log('  Running delay benchmark...');
        results[impl.name].delay = await benchmarkDelay(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Delay failed: ${e.message}`);
        results[impl.name].delay = null;
    }

    try {
        console.log('  Running waveshaper benchmark...');
        results[impl.name].waveshaper = await benchmarkWaveShaper(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ WaveShaper failed: ${e.message}`);
        results[impl.name].waveshaper = null;
    }

    try {
        console.log('  Running complex graph benchmark...');
        results[impl.name].complexGraph = await benchmarkComplexGraph(impl.OfflineAudioContext, 5);
    } catch (e) {
        console.log(`  ✗ Complex graph failed: ${e.message}`);
        results[impl.name].complexGraph = null;
    }

    try {
        console.log('  Running filter chain benchmark...');
        results[impl.name].filterChain = await benchmarkFilterChain(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Filter chain failed: ${e.message}`);
        results[impl.name].filterChain = null;
    }

    try {
        console.log('  Running channel operations benchmark...');
        results[impl.name].channelOps = await benchmarkChannelOps(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Channel ops failed: ${e.message}`);
        results[impl.name].channelOps = null;
    }

    try {
        console.log('  Running node creation benchmark...');
        results[impl.name].nodeCreation = await benchmarkNodeCreation(
            impl.OfflineAudioContext,
            100
        );
    } catch (e) {
        console.log(`  ✗ Node creation failed: ${e.message}`);
        results[impl.name].nodeCreation = null;
    }

    try {
        console.log('  Running convolver (reverb) benchmark...');
        results[impl.name].convolver = await benchmarkConvolver(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Convolver failed: ${e.message}`);
        results[impl.name].convolver = null;
    }

    try {
        console.log('  Running compressor benchmark...');
        results[impl.name].compressor = await benchmarkCompressor(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Compressor failed: ${e.message}`);
        results[impl.name].compressor = null;
    }

    try {
        console.log('  Running stereo panner benchmark...');
        results[impl.name].stereoPanner = await benchmarkStereoPanner(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Stereo panner failed: ${e.message}`);
        results[impl.name].stereoPanner = null;
    }

    try {
        console.log('  Running buffer playback benchmark...');
        results[impl.name].bufferPlayback = await benchmarkBufferPlayback(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Buffer playback failed: ${e.message}`);
        results[impl.name].bufferPlayback = null;
    }

    try {
        console.log('  Running analyser benchmark...');
        results[impl.name].analyser = await benchmarkAnalyser(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Analyser failed: ${e.message}`);
        results[impl.name].analyser = null;
    }

    try {
        console.log('  Running oscillators benchmark...');
        results[impl.name].oscillators = await benchmarkOscillators(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Oscillators failed: ${e.message}`);
        results[impl.name].oscillators = null;
    }

    try {
        console.log('  Running IIR filter benchmark...');
        results[impl.name].iirFilter = await benchmarkIIRFilter(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ IIR filter failed: ${e.message}`);
        results[impl.name].iirFilter = null;
    }

    try {
        console.log('  Running 3D panner benchmark...');
        results[impl.name].panner3D = await benchmark3DPanner(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ 3D panner failed: ${e.message}`);
        results[impl.name].panner3D = null;
    }

    try {
        console.log('  Running heavy processing benchmark...');
        results[impl.name].heavyProcessing = await benchmarkHeavyProcessing(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Heavy processing failed: ${e.message}`);
        results[impl.name].heavyProcessing = null;
    }

    try {
        console.log('  Running stress test benchmark...');
        results[impl.name].stressTest = await benchmarkStressTest(impl.OfflineAudioContext, 5);
    } catch (e) {
        console.log(`  ✗ Stress test failed: ${e.message}`);
        results[impl.name].stressTest = null;
    }

    try {
        console.log('  Running ConstantSource benchmark...');
        results[impl.name].constantSource = await benchmarkConstantSource(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ ConstantSource failed: ${e.message}`);
        results[impl.name].constantSource = null;
    }

    try {
        console.log('  Running gain ramping benchmark...');
        results[impl.name].gainRamping = await benchmarkGainRamping(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Gain ramping failed: ${e.message}`);
        results[impl.name].gainRamping = null;
    }

    try {
        console.log('  Running PeriodicWave benchmark...');
        results[impl.name].periodicWave = await benchmarkPeriodicWave(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ PeriodicWave failed: ${e.message}`);
        results[impl.name].periodicWave = null;
    }

    try {
        console.log('  Running delay modulation benchmark...');
        results[impl.name].delayModulation = await benchmarkDelayModulation(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Delay modulation failed: ${e.message}`);
        results[impl.name].delayModulation = null;
    }

    try {
        console.log('  Running filter modulation benchmark...');
        results[impl.name].filterModulation = await benchmarkFilterModulation(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Filter modulation failed: ${e.message}`);
        results[impl.name].filterModulation = null;
    }

    try {
        console.log('  Running envelope generator benchmark...');
        results[impl.name].envelopeGenerator = await benchmarkEnvelopeGenerator(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Envelope generator failed: ${e.message}`);
        results[impl.name].envelopeGenerator = null;
    }

    try {
        console.log('  Running ring modulation benchmark...');
        results[impl.name].ringModulation = await benchmarkRingModulation(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Ring modulation failed: ${e.message}`);
        results[impl.name].ringModulation = null;
    }

    try {
        console.log('  Running granular synthesis benchmark...');
        results[impl.name].granularSynthesis = await benchmarkGranularSynthesis(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Granular synthesis failed: ${e.message}`);
        results[impl.name].granularSynthesis = null;
    }

    try {
        console.log('  Running filter types benchmark...');
        results[impl.name].filterTypes = await benchmarkFilterTypes(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Filter types failed: ${e.message}`);
        results[impl.name].filterTypes = null;
    }

    try {
        console.log('  Running multichannel benchmark...');
        results[impl.name].multichannel = await benchmarkMultichannel(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Multichannel failed: ${e.message}`);
        results[impl.name].multichannel = null;
    }

    try {
        console.log('  Running sample rates benchmark...');
        results[impl.name].sampleRates = await benchmarkSampleRates(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Sample rates failed: ${e.message}`);
        results[impl.name].sampleRates = null;
    }

    try {
        console.log('  Running channel counts benchmark...');
        results[impl.name].channelCounts = await benchmarkChannelCounts(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Channel counts failed: ${e.message}`);
        results[impl.name].channelCounts = null;
    }

    try {
        console.log('  Running AudioListener benchmark...');
        results[impl.name].audioListener = await benchmarkAudioListener(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ AudioListener failed: ${e.message}`);
        results[impl.name].audioListener = null;
    }

    try {
        console.log('  Running distance models benchmark...');
        results[impl.name].distanceModels = await benchmarkDistanceModels(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Distance models failed: ${e.message}`);
        results[impl.name].distanceModels = null;
    }

    try {
        console.log('  Running oversampling benchmark...');
        results[impl.name].oversampling = await benchmarkOversampling(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Oversampling failed: ${e.message}`);
        results[impl.name].oversampling = null;
    }

    try {
        console.log('  Running FFT sizes benchmark...');
        results[impl.name].analyserProcessOverhead = await benchmarkAnalyserProcessOverhead(
            impl.OfflineAudioContext,
            10
        );
    } catch (e) {
        console.log(`  ✗ Analyser Process Overhead failed: ${e.message}`);
        results[impl.name].analyserProcessOverhead = null;
    }

    try {
        console.log('  Running impulse sizes benchmark...');
        results[impl.name].impulseSizes = await benchmarkImpulseSizes(impl.OfflineAudioContext, 10);
    } catch (e) {
        console.log(`  ✗ Impulse sizes failed: ${e.message}`);
        results[impl.name].impulseSizes = null;
    }
}

// Print results
printHeader('Offline Rendering (1 second of audio)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].offline;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1000000, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Mixing Performance (100 simultaneous sources)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].mixing;
        if (!r) return [impl.name, 'FAILED', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.samplesPerSec / 1000000, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('AudioParam Automation (1000 events)');
{
    const headers = ['Implementation', 'Schedule (ms)', 'Render (ms)', 'Total (ms)', 'Events/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].automation;
        if (!r) return [impl.name, 'FAILED', '-', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgScheduleTimeMs, 2),
            formatNumber(r.avgRenderTimeMs, 2),
            formatNumber(r.avgTotalTimeMs, 2),
            formatNumber(r.eventsPerSecSchedule, 0)
        ];
    });
    printTable(headers, rows);
}

printHeader('Memory Usage (100 sources, shared buffer)');
{
    const headers = ['Implementation', 'Total Delta', 'Per Source', '% of Naive'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].memory;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatBytes(r.totalDeltaBytes),
            formatBytes(r.bytesPerSource),
            formatNumber(r.memoryVsNaive, 1) + '%'
        ];
    });
    printTable(headers, rows);
}

printHeader('MP3 Processing (decode + gain, no filters due to webaudio-node bug)');
{
    const headers = ['Implementation', 'Decode (ms)', 'Process (ms)', 'Total (ms)'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].mp3;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgDecodeTimeMs, 2),
            formatNumber(r.avgProcessTimeMs, 2),
            formatNumber(r.avgTotalTimeMs, 2)
        ];
    });
    printTable(headers, rows);
}

printHeader('Delay Node (1 second with feedback)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].delay;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('WaveShaper (1 second with 2x oversampling)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].waveshaper;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Complex Graph (4 parallel chains)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].complexGraph;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Filter Chain (5 cascaded filters)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].filterChain;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Channel Operations (split/process/merge)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].channelOps;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Node Creation (150 nodes per iteration)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Nodes/sec', 'Min Time (ms)'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].nodeCreation;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.nodesPerSec / 1000, 1) + 'K',
            formatNumber(r.minTimeMs, 2)
        ];
    });
    printTable(headers, rows);
}

printHeader('Convolver (Reverb with 1s impulse response)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].convolver;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Dynamics Compressor (4 sources with aggressive settings)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].compressor;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Stereo Panner (16 sources across stereo field)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].stereoPanner;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Buffer Playback (50 sound effects)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].bufferPlayback;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Analyser (FFT with 2048 fftSize)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].analyser;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Oscillators (16 oscillators, 4 waveform types)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].oscillators;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('IIR Filter (4 cascaded custom filters)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].iirFilter;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('3D Panner (8 sources with HRTF positioning)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].panner3D;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Heavy Processing (Full mixing/mastering chain)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].heavyProcessing;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Stress Test (100 sources, 400 total nodes)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].stressTest;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('ConstantSource (16 oscillators with LFO modulation)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].constantSource;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Gain Ramping (20 crossfades)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].gainRamping;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('PeriodicWave (8 custom waveforms, 32 harmonics)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].periodicWave;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Delay Modulation (4 sources with chorus effect)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].delayModulation;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Filter Modulation (4 oscillators with auto-wah)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].filterModulation;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Envelope Generator (16 notes with ADSR)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].envelopeGenerator;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Ring Modulation (8 voices)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].ringModulation;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Granular Synthesis (100 grains)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].granularSynthesis;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Filter Types (8 filter types)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].filterTypes;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Multichannel (5.1 surround)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].multichannel;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Sample Rates Comparison');
{
    const sampleRates = [8000, 16000, 22050, 44100, 48000, 96000];
    for (const sampleRate of sampleRates) {
        console.log(`\n${bold}${sampleRate} Hz:${reset}`);
        const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
        const rows = implementations.map(impl => {
            const r = results[impl.name].sampleRates;
            if (!r || !r[sampleRate]) return [impl.name, 'FAILED', '-', '-'];
            const sr = r[sampleRate];
            return [
                impl.name,
                formatNumber(sr.avgTimeMs, 2),
                formatNumber(sr.realtimeMultiplier, 0) + 'x',
                formatNumber(sr.samplesPerSec / 1e6, 2) + 'M'
            ];
        });
        printTable(headers, rows);
    }
}

printHeader('Channel Counts Comparison');
{
    const channelCounts = [1, 2, 4, 6, 8];
    for (const channelCount of channelCounts) {
        console.log(`\n${bold}${channelCount} Channel${channelCount > 1 ? 's' : ''}:${reset}`);
        const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
        const rows = implementations.map(impl => {
            const r = results[impl.name].channelCounts;
            if (!r || !r[channelCount]) return [impl.name, 'FAILED', '-', '-'];
            const cc = r[channelCount];
            return [
                impl.name,
                formatNumber(cc.avgTimeMs, 2),
                formatNumber(cc.realtimeMultiplier, 0) + 'x',
                formatNumber(cc.samplesPerSec / 1e6, 2) + 'M'
            ];
        });
        printTable(headers, rows);
    }
}

printHeader('AudioListener (8 sources, 50 position/orientation changes)');
{
    const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
    const rows = implementations.map(impl => {
        const r = results[impl.name].audioListener;
        if (!r) return [impl.name, 'FAILED', '-', '-'];
        return [
            impl.name,
            formatNumber(r.avgTimeMs, 2),
            formatNumber(r.realtimeMultiplier, 0) + 'x',
            formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
        ];
    });
    printTable(headers, rows);
}

printHeader('Panner Distance Models');
{
    const distanceModels = ['linear', 'inverse', 'exponential'];
    for (const distanceModel of distanceModels) {
        console.log(
            `\n${bold}${distanceModel.charAt(0).toUpperCase() + distanceModel.slice(1)}:${reset}`
        );
        const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
        const rows = implementations.map(impl => {
            const r = results[impl.name].distanceModels;
            if (!r || !r[distanceModel]) return [impl.name, 'FAILED', '-', '-'];
            const dm = r[distanceModel];
            return [
                impl.name,
                formatNumber(dm.avgTimeMs, 2),
                formatNumber(dm.realtimeMultiplier, 0) + 'x',
                formatNumber(dm.samplesPerSec / 1e6, 2) + 'M'
            ];
        });
        printTable(headers, rows);
    }
}

printHeader('WaveShaper Oversampling Levels');
{
    const oversampleLevels = ['none', '2x', '4x'];
    for (const oversample of oversampleLevels) {
        console.log(`\n${bold}${oversample}:${reset}`);
        const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
        const rows = implementations.map(impl => {
            const r = results[impl.name].oversampling;
            if (!r || !r[oversample]) return [impl.name, 'FAILED', '-', '-'];
            const os = r[oversample];
            return [
                impl.name,
                formatNumber(os.avgTimeMs, 2),
                formatNumber(os.realtimeMultiplier, 0) + 'x',
                formatNumber(os.samplesPerSec / 1e6, 2) + 'M'
            ];
        });
        printTable(headers, rows);
    }
}

printHeader('Analyser FFT Sizes');
{
    const fftSizes = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
    for (const fftSize of fftSizes) {
        console.log(`\n${bold}${fftSize}:${reset}`);
        const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
        const rows = implementations.map(impl => {
            const r = results[impl.name].analyserProcessOverhead;
            if (!r || !r[fftSize]) return [impl.name, 'FAILED', '-', '-'];
            const fs = r[fftSize];
            return [
                impl.name,
                formatNumber(fs.avgTimeMs, 2),
                formatNumber(fs.realtimeMultiplier, 0) + 'x',
                formatNumber(fs.samplesPerSec / 1e6, 2) + 'M'
            ];
        });
        printTable(headers, rows);
    }
}

printHeader('Convolver Impulse Response Sizes');
{
    const impulseDurations = [0.1, 0.5, 1.0, 2.0, 4.0];
    for (const impulseDuration of impulseDurations) {
        console.log(
            `\n${bold}${impulseDuration}s (${Math.floor(48000 * impulseDuration)} samples):${reset}`
        );
        const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
        const rows = implementations.map(impl => {
            const r = results[impl.name].impulseSizes;
            if (!r || !r[impulseDuration]) return [impl.name, 'FAILED', '-', '-'];
            const is = r[impulseDuration];
            return [
                impl.name,
                formatNumber(is.avgTimeMs, 2),
                formatNumber(is.realtimeMultiplier, 0) + 'x',
                formatNumber(is.samplesPerSec / 1e6, 2) + 'M'
            ];
        });
        printTable(headers, rows);
    }
}

// Calculate winners
printHeader('Summary');
{
    const winners = {
        offline: null,
        mixing: null,
        automation: null,
        memory: null,
        mp3: null
    };

    // Find fastest for each category
    let bestOffline = Infinity;
    let bestMixing = Infinity;
    let bestAutomation = Infinity;
    let bestMemory = Infinity;
    let bestMP3 = Infinity;

    for (const impl of implementations) {
        const r = results[impl.name];
        if (r.offline && r.offline.avgTimeMs < bestOffline) {
            bestOffline = r.offline.avgTimeMs;
            winners.offline = impl.name;
        }
        if (r.mixing && r.mixing.avgTimeMs < bestMixing) {
            bestMixing = r.mixing.avgTimeMs;
            winners.mixing = impl.name;
        }
        if (r.automation && r.automation.avgTotalTimeMs < bestAutomation) {
            bestAutomation = r.automation.avgTotalTimeMs;
            winners.automation = impl.name;
        }
        if (r.memory && r.memory.totalDeltaBytes < bestMemory) {
            bestMemory = r.memory.totalDeltaBytes;
            winners.memory = impl.name;
        }
        if (r.mp3 && r.mp3.avgTotalTimeMs < bestMP3) {
            bestMP3 = r.mp3.avgTotalTimeMs;
            winners.mp3 = impl.name;
        }
    }

    console.log(`🏆 Fastest Offline Rendering:  ${bold}${winners.offline || 'N/A'}${reset}`);
    console.log(`🏆 Fastest Mixing:             ${bold}${winners.mixing || 'N/A'}${reset}`);
    console.log(`🏆 Fastest Automation:         ${bold}${winners.automation || 'N/A'}${reset}`);
    console.log(`🏆 Fastest MP3 Processing:     ${bold}${winners.mp3 || 'N/A'}${reset}`);
    console.log(`🏆 Lowest Memory Usage:        ${bold}${winners.memory || 'N/A'}${reset}`);
}

console.log('\n✅ Benchmarks complete!\n');
