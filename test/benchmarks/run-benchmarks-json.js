#!/usr/bin/env node
/**
 * Run all benchmarks and output results as JSON
 * This provides structured data for documentation generation
 */

import { benchmarkOfflineRendering } from './bench-offline-rendering.js';
import { benchmarkMixing } from './bench-mixing.js';
import { benchmarkAutomation } from './bench-automation.js';
import { benchmarkMemory } from './bench-memory.js';
import { benchmarkMP3Processing } from './bench-mp3-processing.js';
import { benchmarkMP3Decode } from './bench-mp3-decode.js';
import { benchmarkProcessingChain } from './bench-processing-chain.js';
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
import { benchmarkFFTSizes } from './bench-fft-sizes.js';
import { benchmarkImpulseSizes } from './bench-impulse-sizes.js';

// Load implementations
const implementations = [];

// Try to load node-web-audio-api
try {
    const { OfflineAudioContext, AudioContext } = await import('node-web-audio-api');
    implementations.push({
        name: 'node-web-audio-api',
        OfflineAudioContext,
        AudioContext
    });
} catch (e) {
    // Skip if not installed
}

// Try to load webaudio-node (local)
try {
    const webaudioNode = await import('../../index.js');
    implementations.push({
        name: 'webaudio-node',
        OfflineAudioContext: webaudioNode.OfflineAudioContext,
        AudioContext: webaudioNode.AudioContext
    });
} catch (e) {
    console.error('Failed to load webaudio-node:', e.message);
}

if (implementations.length === 0) {
    console.error('No implementations loaded');
    process.exit(1);
}

// Benchmark definitions
const benchmarks = [
    { name: 'Offline Rendering (1 second of audio)', fn: benchmarkOfflineRendering },
    { name: 'Mixing Performance (100 simultaneous sources)', fn: benchmarkMixing },
    { name: 'AudioParam Automation (1000 events)', fn: benchmarkAutomation },
    { name: 'MP3 Decode', fn: benchmarkMP3Decode },
    { name: 'Audio Processing Chain (filter + compressor + gain)', fn: benchmarkProcessingChain },
    { name: 'Delay Node (1 second with feedback)', fn: benchmarkDelay },
    { name: 'WaveShaper (1 second with 2x oversampling)', fn: benchmarkWaveShaper },
    { name: 'Complex Graph (4 parallel chains)', fn: benchmarkComplexGraph },
    { name: 'Filter Chain (5 cascaded filters)', fn: benchmarkFilterChain },
    { name: 'Channel Operations (split/process/merge)', fn: benchmarkChannelOps },
    { name: 'Node Creation (150 nodes per iteration)', fn: benchmarkNodeCreation },
    { name: 'Convolver (Reverb with 1s impulse response)', fn: benchmarkConvolver },
    { name: 'Dynamics Compressor (4 sources with aggressive settings)', fn: benchmarkCompressor },
    { name: 'Stereo Panner (16 sources across stereo field)', fn: benchmarkStereoPanner },
    { name: 'Buffer Playback (50 sound effects)', fn: benchmarkBufferPlayback },
    { name: 'Analyser (FFT with 2048 fftSize)', fn: benchmarkAnalyser },
    { name: 'Oscillators (16 oscillators, 4 waveform types)', fn: benchmarkOscillators },
    { name: 'IIR Filter (4 cascaded custom filters)', fn: benchmarkIIRFilter },
    { name: '3D Panner (8 sources with HRTF positioning)', fn: benchmark3DPanner },
    { name: 'Heavy Processing (Full mixing/mastering chain)', fn: benchmarkHeavyProcessing },
    { name: 'Stress Test (100 sources, 400 total nodes)', fn: benchmarkStressTest },
    { name: 'ConstantSource (16 oscillators with LFO modulation)', fn: benchmarkConstantSource },
    { name: 'Gain Ramping (20 crossfades)', fn: benchmarkGainRamping },
    { name: 'PeriodicWave (8 custom waveforms, 32 harmonics)', fn: benchmarkPeriodicWave },
    { name: 'Delay Modulation (4 sources with chorus effect)', fn: benchmarkDelayModulation },
    { name: 'Filter Modulation (4 oscillators with auto-wah)', fn: benchmarkFilterModulation },
    { name: 'Envelope Generator (16 notes with ADSR)', fn: benchmarkEnvelopeGenerator },
    { name: 'Ring Modulation (8 voices)', fn: benchmarkRingModulation },
    { name: 'Granular Synthesis (100 grains)', fn: benchmarkGranularSynthesis },
    { name: 'Filter Types (8 filter types)', fn: benchmarkFilterTypes },
    { name: 'Multichannel (5.1 surround)', fn: benchmarkMultichannel },
    { name: 'Sample Rates Comparison', fn: benchmarkSampleRates },
    { name: 'Channel Counts Comparison', fn: benchmarkChannelCounts },
    { name: 'AudioListener (8 sources, 50 position/orientation changes)', fn: benchmarkAudioListener },
    { name: 'Panner Distance Models', fn: benchmarkDistanceModels },
    { name: 'WaveShaper Oversampling Levels', fn: benchmarkOversampling },
    { name: 'Analyser FFT Sizes', fn: benchmarkFFTSizes },
    { name: 'Convolver Impulse Response Sizes', fn: benchmarkImpulseSizes }
];

const results = [];

// Run all benchmarks
for (const impl of implementations) {
    for (const benchmark of benchmarks) {
        try {
            let result;

            // Special handling for benchmarks that need AudioContext or mp3 path
            if (benchmark.name === 'MP3 Decode') {
                result = await benchmark.fn(
                    impl.AudioContext,
                    'test/benchmarks/test-audio.mp3',
                    5
                );
            } else {
                // Standard benchmarks use OfflineAudioContext
                result = await benchmark.fn(impl.OfflineAudioContext);
            }

            // Handle both simple results and multi-variant results
            if (result.variants) {
                // Multi-variant benchmark (like Sample Rates, FFT Sizes, etc.)
                for (const variant of result.variants) {
                    results.push({
                        implementation: impl.name,
                        benchmark: `${benchmark.name} (${variant.name})`,
                        ...variant,
                        error: null
                    });
                }
            } else {
                // Simple benchmark
                results.push({
                    implementation: impl.name,
                    benchmark: benchmark.name,
                    ...result,
                    error: null
                });
            }
        } catch (error) {
            results.push({
                implementation: impl.name,
                benchmark: benchmark.name,
                error: error.message,
                avgTimeMs: null,
                realtimeMultiplier: null
            });
        }
    }
}

// Output as JSON
console.log(JSON.stringify(results, null, 2));
