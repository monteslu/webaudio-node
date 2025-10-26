#!/usr/bin/env node

// WASM Build Script
// Compiles all C++ modules to WebAssembly with SIMD optimization

import { execSync } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// WASM build configuration
const BUILD_CONFIG = {
    compiler: 'emcc',
    flags: [
        '-O3',                    // Maximum optimization
        '-msimd128',              // Enable WASM SIMD
        '-s WASM=1',             // Output WASM
        '-s ALLOW_MEMORY_GROWTH=1',  // Dynamic memory
        '-s MODULARIZE=1',       // Module pattern
        '-s EXPORT_ES6=1',       // ES6 module
        '-s EXPORT_NAME=MODULE_NAME',  // Placeholder
        '--no-entry',            // Library mode
    ],
    runtimeMethods: '["ccall","cwrap","getValue","setValue","HEAPF32"]',
};

// Module definitions
const MODULES = [
    {
        name: 'wave_shaper_poc',
        displayName: 'WaveShaper (POC)',
        source: 'src/wasm/wave_shaper_poc.cpp',
        output: 'dist/wave_shaper_poc.mjs',
        exportName: 'createWaveShaperModule',
        functions: [
            '_createWaveShaper',
            '_setCurve',
            '_clearCurve',
            '_processWaveShaper',
            '_destroyWaveShaper',
            '_malloc',
            '_free',
        ],
    },
    {
        name: 'fft',
        displayName: 'FFT Utility',
        source: 'src/wasm/utils/fft.cpp',
        output: 'dist/fft.mjs',
        exportName: 'createFFTModule',
        functions: [
            '_createFFT',
            '_forwardFFT',
            '_getMagnitude',
            '_magnitudeToDecibels',
            '_inverseFFT',
            '_destroyFFT',
            '_malloc',
            '_free',
        ],
    },
    {
        name: 'mixer',
        displayName: 'Mixer Utility',
        source: 'src/wasm/utils/mixer.cpp',
        output: 'dist/mixer.mjs',
        exportName: 'createMixerModule',
        functions: [
            '_mix',
            '_clear',
            '_copy',
            '_applyGain',
            '_clip',
        ],
    },
    {
        name: 'resampler',
        displayName: 'Resampler Utility',
        source: 'src/wasm/utils/resampler.cpp',
        output: 'dist/resampler.mjs',
        exportName: 'createResamplerModule',
        functions: [
            '_createResampler',
            '_processResampler',
            '_resetResampler',
            '_destroyResampler',
        ],
    },
    {
        name: 'audio_param',
        displayName: 'AudioParam Utility',
        source: 'src/wasm/utils/audio_param.cpp',
        output: 'dist/audio_param.mjs',
        exportName: 'createAudioParamModule',
        functions: [
            '_createAudioParam',
            '_destroyAudioParam',
            '_setParamValue',
            '_getParamValue',
            '_setParamValueAtTime',
            '_linearRampToValueAtTime',
            '_exponentialRampToValueAtTime',
            '_setTargetAtTime',
            '_cancelScheduledParamValues',
            '_getParamValueAtTime',
        ],
    },
    {
        name: 'gain_node',
        displayName: 'GainNode',
        source: 'src/wasm/nodes/gain_node.cpp',
        output: 'dist/gain_node.mjs',
        exportName: 'createGainNodeModule',
        functions: [
            '_createGainNode',
            '_destroyGainNode',
            '_processGainNode',
        ],
    },
    {
        name: 'oscillator_node',
        displayName: 'OscillatorNode',
        source: 'src/wasm/nodes/oscillator_node.cpp',
        output: 'dist/oscillator_node.mjs',
        exportName: 'createOscillatorNodeModule',
        functions: [
            '_createOscillatorNode',
            '_destroyOscillatorNode',
            '_startOscillator',
            '_stopOscillator',
            '_setOscillatorWaveType',
            '_setPeriodicWave',
            '_processOscillatorNode',
        ],
    },
];

function buildModule(module) {
    const { name, displayName, source, output, exportName, functions } = module;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Building: ${displayName}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Check source exists
    const sourcePath = path.join(rootDir, source);
    if (!existsSync(sourcePath)) {
        console.error(`❌ Source not found: ${source}`);
        return false;
    }

    // Ensure output directory exists
    const outputPath = path.join(rootDir, output);
    const outputDir = path.dirname(outputPath);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    // Build command
    const flags = BUILD_CONFIG.flags
        .map(f => f.replace('MODULE_NAME', `'${exportName}'`))
        .join(' ');

    const exportedFunctions = JSON.stringify(functions);
    const command = [
        BUILD_CONFIG.compiler,
        flags,
        `-s EXPORTED_FUNCTIONS='${exportedFunctions}'`,
        `-s EXPORTED_RUNTIME_METHODS='${BUILD_CONFIG.runtimeMethods}'`,
        source,
        `-o ${output}`,
    ].join(' ');

    console.log(`Source: ${source}`);
    console.log(`Output: ${output}`);
    console.log(`Exported Functions: ${functions.length}`);
    console.log('');

    try {
        console.log('Compiling...');
        execSync(command, {
            cwd: rootDir,
            stdio: 'inherit',
        });

        // Check output exists
        if (!existsSync(outputPath)) {
            console.error(`❌ Build failed: ${output} not created`);
            return false;
        }

        // Get file size
        const stats = statSync(outputPath);
        const wasmPath = outputPath.replace('.mjs', '.wasm');
        const wasmStats = statSync(wasmPath);

        console.log('');
        console.log(`✅ Build successful!`);
        console.log(`   WASM: ${(wasmStats.size / 1024).toFixed(1)} KB`);
        console.log(`   JS:   ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`   Total: ${((stats.size + wasmStats.size) / 1024).toFixed(1)} KB`);

        return true;
    } catch (error) {
        console.error(`❌ Build failed for ${displayName}`);
        console.error(error.message);
        return false;
    }
}

async function buildAll() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   WASM Build System                       ║');
    console.log('║   webaudio-node → WebAssembly Migration  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log(`Modules to build: ${MODULES.length}`);
    console.log(`Compiler: ${BUILD_CONFIG.compiler}`);
    console.log(`Optimization: -O3 -msimd128`);

    let successCount = 0;
    let failCount = 0;

    for (const module of MODULES) {
        const success = await buildModule(module);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   Build Summary                           ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`✅ Success: ${successCount}/${MODULES.length}`);
    if (failCount > 0) {
        console.log(`❌ Failed:  ${failCount}/${MODULES.length}`);
    }
    console.log('');

    if (failCount > 0) {
        console.error('Build completed with errors');
        process.exit(1);
    }

    console.log('🎉 All modules built successfully!\n');
}

// Run build
buildAll().catch(err => {
    console.error('Build system error:', err);
    process.exit(1);
});
