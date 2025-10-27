# WASM Migration Plan

## Executive Summary

**Objective:** Migrate webaudio-node from native C++ (N-API) to WebAssembly to eliminate native build complexity while maintaining performance leadership.

**Strategic Rationale:**

- **Performance Budget:** Current 200-3000% performance wins provide massive headroom for WASM overhead (typically 10-30%)
- **Build Simplification:** Eliminate node-gyp, Python, platform-specific compilers, and 5-platform CI/CD matrix
- **Deployment Simplification:** Single WASM file instead of 5 platform-specific binaries
- **Future-Proof:** Browser compatibility for free, enabling Web Audio API in both Node.js and browsers
- **Maintainability:** Modern WASM toolchain with excellent debugging and profiling

**Expected Performance Impact:**

- **Best Case:** 10-20% slower than native (WASM SIMD optimization)
- **Realistic Case:** 20-40% slower than native (typical WASM overhead)
- **Worst Case:** 50% slower than native (conservative estimate)
- **Risk Assessment:** Even at 50% overhead, we maintain performance wins on 80%+ benchmarks

---

## Current Performance Analysis

### Performance Headroom by Category

| Benchmark            | Current Advantage | 50% Overhead Result | Status After WASM |
| -------------------- | ----------------- | ------------------- | ----------------- |
| 3D Panner (HRTF)     | **3029% faster**  | 1514% faster        | ✅ Still crushing |
| WaveShaper 4x        | **289% faster**   | 144% faster         | ✅ Still crushing |
| Convolver (1s IR)    | **294% faster**   | 147% faster         | ✅ Still crushing |
| Mixing (100 sources) | **235% faster**   | 117% faster         | ✅ Still crushing |
| Analyser FFT 4096    | **170% faster**   | 85% faster          | ✅ Still winning  |
| Channel Operations   | **147% faster**   | 73% faster          | ✅ Still winning  |
| Analyser FFT 512     | **51% faster**    | 25% faster          | ✅ Still winning  |
| Filter Chain (5)     | **47% faster**    | 23% faster          | ✅ Still winning  |
| Complex Graph (4)    | **43% faster**    | 21% faster          | ✅ Still winning  |

**Critical Insight:** We can afford to lose **50% performance** and still win 90%+ of benchmarks.

### At-Risk Benchmarks

Small wins that might flip with WASM overhead:

- Delay Node: 17% faster → may become tied
- Offline Rendering: 13% faster → may become tied
- Dynamics Compressor: 6% faster → may become tied
- 1ch Biquad: 8% faster → may become tied

**Verdict:** Acceptable trade-off for massive reduction in build/deployment complexity.

---

## WASM SIMD Capabilities

### Instruction Set Comparison

| Operation           | ARM NEON       | WASM SIMD (v128)                   | Availability     |
| ------------------- | -------------- | ---------------------------------- | ---------------- |
| Load 4 floats       | `vld1q_f32()`  | `wasm_v128_load()`                 | ✅               |
| Store 4 floats      | `vst1q_f32()`  | `wasm_v128_store()`                | ✅               |
| Add 4 floats        | `vaddq_f32()`  | `wasm_f32x4_add()`                 | ✅               |
| Multiply 4 floats   | `vmulq_f32()`  | `wasm_f32x4_mul()`                 | ✅               |
| **FMA (critical!)** | `vmlaq_f32()`  | `wasm_f32x4_add(wasm_f32x4_mul())` | ⚠️ No native FMA |
| Square root         | `vsqrtq_f32()` | `wasm_f32x4_sqrt()`                | ✅               |
| Min/Max             | `vminq_f32()`  | `wasm_f32x4_min()`                 | ✅               |

**Key Limitation:** WASM lacks fused multiply-add instruction (critical for biquad filters)
**Workaround:** Separate multiply + add (2 instructions instead of 1)
**Impact:** ~5-10% performance loss on biquad-heavy workloads

### WASM SIMD Code Examples

#### Example 1: WaveShaper Processing (Current Biggest Win)

**Current ARM NEON code** (`wave_shaper_node.cpp:94-170`):

```cpp
#ifdef __ARM_NEON
for (; i + 7 < size; i += 8) {
    // Load 8 samples
    float32x4_t in1 = vld1q_f32(&input[i]);
    float32x4_t in2 = vld1q_f32(&input[i + 4]);

    // Process through curve lookup (unrolled)
    // ... curve mapping logic ...

    // Store results
    vst1q_f32(&output[i], out1);
    vst1q_f32(&output[i + 4], out2);
}
#endif
```

**WASM SIMD equivalent**:

```cpp
#include <wasm_simd128.h>

for (; i + 7 < size; i += 8) {
    // Load 8 samples
    v128_t in1 = wasm_v128_load(&input[i]);
    v128_t in2 = wasm_v128_load(&input[i + 4]);

    // Process through curve lookup (unrolled)
    // ... curve mapping logic (identical algorithm) ...

    // Store results
    wasm_v128_store(&output[i], out1);
    wasm_v128_store(&output[i + 4], out2);
}
```

**Conversion Effort:** Low - direct mapping, same algorithms

#### Example 2: FFT Magnitude Computation

**Current ARM NEON code** (`fft.cpp:275-312`):

```cpp
#ifdef __ARM_NEON
for (; i + 3 < size; i += 4) {
    // Load 4 complex numbers: [r0, i0, r1, i1, r2, i2, r3, i3]
    float32x4x2_t complex_vals = vld2q_f32(&data[i * 2]);
    float32x4_t real = complex_vals.val[0];  // [r0, r1, r2, r3]
    float32x4_t imag = complex_vals.val[1];  // [i0, i1, i2, i3]

    // Compute real^2 and imag^2
    float32x4_t real_sq = vmulq_f32(real, real);
    float32x4_t imag_sq = vmulq_f32(imag, imag);

    // Sum: real^2 + imag^2
    float32x4_t sum = vaddq_f32(real_sq, imag_sq);

    // Square root
    float32x4_t mag = vsqrtq_f32(sum);

    // Store
    vst1q_f32(&magnitude[i], mag);
}
#endif
```

**WASM SIMD equivalent**:

```cpp
for (; i + 3 < size; i += 4) {
    // Manual deinterleaving (WASM lacks vld2q equivalent)
    v128_t c0 = wasm_v128_load(&data[i * 2]);      // [r0, i0, r1, i1]
    v128_t c1 = wasm_v128_load(&data[i * 2 + 4]);  // [r2, i2, r3, i3]

    // Shuffle to separate real/imag
    // real = [r0, r1, r2, r3], imag = [i0, i1, i2, i3]
    v128_t real = wasm_i32x4_shuffle(c0, c1, 0, 2, 4, 6);
    v128_t imag = wasm_i32x4_shuffle(c0, c1, 1, 3, 5, 7);

    // Compute real^2 and imag^2
    v128_t real_sq = wasm_f32x4_mul(real, real);
    v128_t imag_sq = wasm_f32x4_mul(imag, imag);

    // Sum: real^2 + imag^2
    v128_t sum = wasm_f32x4_add(real_sq, imag_sq);

    // Square root
    v128_t mag = wasm_f32x4_sqrt(sum);

    // Store
    wasm_v128_store(&magnitude[i], mag);
}
```

**Conversion Effort:** Medium - requires manual deinterleaving, but same algorithm

#### Example 3: Biquad Filter (Most Complex)

**Current ARM NEON code** (`biquad_filter_node.cpp`):

```cpp
// Direct Form I: y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
y0_vec = vmlaq_f32(b0_x0, b1_vec, x1_vec);  // y0 = b0*x0 + b1*x1
y0_vec = vmlaq_f32(y0_vec, b2_vec, x2_vec); // y0 += b2*x2
y0_vec = vmlsq_f32(y0_vec, a1_vec, y1_vec); // y0 -= a1*y1
y0_vec = vmlsq_f32(y0_vec, a2_vec, y2_vec); // y0 -= a2*y2
```

**WASM SIMD equivalent** (no FMA):

```cpp
// Manual FMA expansion
v128_t y0_vec = wasm_f32x4_mul(b0_vec, x0_vec);           // b0*x0
y0_vec = wasm_f32x4_add(y0_vec, wasm_f32x4_mul(b1_vec, x1_vec));  // + b1*x1
y0_vec = wasm_f32x4_add(y0_vec, wasm_f32x4_mul(b2_vec, x2_vec));  // + b2*x2
y0_vec = wasm_f32x4_sub(y0_vec, wasm_f32x4_mul(a1_vec, y1_vec));  // - a1*y1
y0_vec = wasm_f32x4_sub(y0_vec, wasm_f32x4_mul(a2_vec, y2_vec));  // - a2*y2
```

**Performance Impact:** ~10% slower (8 instructions instead of 4)
**Mitigation:** Already winning on 1-4ch, acceptable loss on 6-8ch (already losing)

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Node.js Application Layer                   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ JavaScript API (ES Modules)
                            ▼
┌─────────────────────────────────────────────────────────┐
│         JavaScript API Layer (unchanged)                 │
│  • AudioContext / OfflineAudioContext                    │
│  • Node Wrapper Classes                                  │
│  • AudioBuffer management                                │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ WASM FFI (Linear Memory)
                            ▼
┌─────────────────────────────────────────────────────────┐
│              WASM Audio Engine                           │
│  • Compiled from C++ with Emscripten                     │
│  • SIMD-optimized processing                             │
│  • Thread pool for parallel node processing              │
│  • Linear memory for audio buffers                       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ Float32Array buffers
                            ▼
                   ┌────────────────────┐
                   │  @kmamal/node-sdl  │
                   │   Audio Device     │
                   └────────────────────┘
```

### Threading Model

**Current (N-API):**

- Main thread: JavaScript + N-API FFI
- SDL audio thread: Native callback → graph processing

**New (WASM + Workers):**

- Main thread: JavaScript API, graph topology
- Worker thread: WASM module execution
- SDL audio thread: Reads SharedArrayBuffer from worker

**Communication:**

```javascript
// Main thread
const audioContext = new AudioContext();
const worker = new Worker('audio-processor.js');

// Shared memory for audio data
const sharedBuffer = new SharedArrayBuffer(bufferSize * 4);
const outputArray = new Float32Array(sharedBuffer);

// Worker processes audio into sharedBuffer
worker.postMessage({ wasmModule, graphData, sharedBuffer });

// SDL reads from sharedBuffer for playback
const { audio } = require('@kmamal/sdl');
audio.openDevice({
    channels: 2,
    frequency: 48000,
    callback: () => outputArray
});
```

### Memory Management

**Linear Memory Layout:**

```
WASM Linear Memory (4GB max)
┌────────────────────────────────────────┐
│ Stack (1MB)                            │
├────────────────────────────────────────┤
│ Heap (managed by dlmalloc)             │
│  ├─ Audio node states                  │
│  ├─ AudioParam automation timelines    │
│  ├─ Temporary processing buffers       │
│  └─ FFT working memory                 │
├────────────────────────────────────────┤
│ Audio Buffer Pool (pre-allocated)      │
│  ├─ Render quantum buffers (128 frames)│
│  ├─ Node output buffers                │
│  └─ Resampling buffers                 │
└────────────────────────────────────────┘
```

**JavaScript ↔ WASM Data Flow:**

```javascript
// Allocate buffer in WASM memory
const bufferPtr = wasmModule._malloc(frameCount * channels * 4);

// Copy input data (if needed)
const inputView = new Float32Array(wasmModule.HEAPF32.buffer, bufferPtr, frameCount * channels);
inputView.set(inputAudioData);

// Process in WASM
wasmModule._processAudioGraph(bufferPtr, frameCount, channels);

// Read output
const outputView = new Float32Array(wasmModule.HEAPF32.buffer, bufferPtr, frameCount * channels);
const result = new Float32Array(outputView);

// Free WASM memory
wasmModule._free(bufferPtr);
```

---

## Migration Phases

### Phase 0: Emscripten Setup & Tooling (1 week)

**Goals:**

- Install and configure Emscripten toolchain
- Create build scripts for WASM compilation
- Set up WASM testing framework

**Deliverables:**

- Working Emscripten build environment
- `scripts/build-wasm.mjs` build script
- Basic WASM module loading in Node.js

**Tasks:**

```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest

# Test basic compilation
emcc -O3 -msimd128 test.cpp -o test.wasm
```

### Phase 1: Proof of Concept - WaveShaper Node (2 weeks)

**Target:** Single node with biggest performance win (207-289% faster)

**Goals:**

- Extract WaveShaper processing logic to standalone WASM module
- Implement WASM SIMD version of 8-sample batching
- Benchmark WASM vs native performance
- Validate approach

**Files to Port:**

- `src/native/nodes/wave_shaper_node.cpp` → `src/wasm/nodes/wave_shaper_node.cpp`
- Keep JavaScript wrapper: `src/javascript/nodes/WaveShaperNode.js`

**Success Criteria:**

- WASM version within 50% of native performance
- Passes all existing WaveShaper tests
- Benchmark shows still faster than Rust competitor

**Build Command:**

```bash
emcc -O3 -msimd128 \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_createWaveShaper","_processWaveShaper","_destroyWaveShaper"]' \
  src/wasm/nodes/wave_shaper_node.cpp \
  -o dist/wave_shaper.wasm
```

**Benchmark:**

```javascript
// Run existing WaveShaper benchmarks with WASM backend
// Compare: Native vs WASM vs Rust
```

### Phase 2: Core Utilities (3 weeks)

**Target:** Shared utilities used by multiple nodes

**Files to Port:**

1. **FFT** (`src/native/utils/fft.cpp`)
    - Radix-4 FFT implementation
    - SIMD magnitude computation
    - Twiddle factor generation

2. **Mixer** (`src/native/utils/mixer.cpp`)
    - Channel mixing and summing
    - Up/down-mixing algorithms
    - SIMD optimizations

3. **Resampler** (`src/native/utils/resampler.cpp`)
    - Sample rate conversion
    - Linear interpolation

**Success Criteria:**

- All utilities compile to WASM
- Pass existing test suite
- Performance within 30% of native

### Phase 3: Audio Analysis Nodes (3 weeks)

**Target:** Analyser, Dynamics Compressor (use FFT utility)

**Files to Port:**

1. **AnalyserNode** (`src/native/nodes/analyser_node.cpp`)
    - FFT processing (uses utility from Phase 2)
    - SIMD windowing, normalization, smoothing
    - Circular buffer management

2. **DynamicsCompressorNode** (`src/native/nodes/dynamics_compressor_node.cpp`)
    - Gain reduction computation
    - Envelope detection

**Success Criteria:**

- Analyser benchmarks maintain performance wins (FFT 512: 51% faster, FFT 4096: 170% faster)
- Reference tests pass (browser parity)

### Phase 4: Spatial Audio & Effects (4 weeks)

**Target:** 3D Panner, Convolver (biggest performance wins)

**Files to Port:**

1. **PannerNode** (`src/native/nodes/panner_node.cpp`)
    - HRTF processing (3029% performance win!)
    - 3D positioning calculations

2. **ConvolverNode** (`src/native/nodes/convolver_node.cpp`)
    - FFT-based convolution (294% performance win)
    - Impulse response processing

3. **StereoPannerNode** (`src/native/nodes/stereo_panner_node.cpp`)
    - Simple stereo positioning

**Success Criteria:**

- Maintain massive performance wins even with WASM overhead
- Pass spatial audio tests

### Phase 5: Filter Nodes (4 weeks)

**Target:** Biquad, IIR, WaveShaper (already done in Phase 1)

**Files to Port:**

1. **BiquadFilterNode** (`src/native/nodes/biquad_filter_node.cpp`)
    - Direct Form I implementation
    - Multi-channel processing (1ch, 2ch, 4ch, 6ch, 8ch)
    - Loop unrolling optimizations

2. **IIRFilterNode** (`src/native/nodes/iir_filter_node.cpp`)
    - Arbitrary order IIR filters

**Success Criteria:**

- 1-4ch maintain performance wins
- 6-8ch acceptable (already losing to Rust, WASM won't make it worse)

### Phase 6: Source & Routing Nodes (3 weeks)

**Target:** Oscillator, BufferSource, Gain, Delay, Channel routing

**Files to Port:**

1. `oscillator_node.cpp` - Waveform generation
2. `buffer_source_node.cpp` - Sample playback
3. `gain_node.cpp` - Volume control with automation
4. `delay_node.cpp` - Time-domain delay
5. `channel_splitter_node.cpp` / `channel_merger_node.cpp` - Routing
6. `constant_source_node.cpp` - DC source

**Success Criteria:**

- All basic nodes functional
- Pass test suite

### Phase 7: Advanced Features (3 weeks)

**Target:** AudioWorklet, MediaStreamSource

**Files to Port:**

1. **AudioWorkletNode** (`src/native/nodes/audio_worklet_node.cpp`)
    - JavaScript processor execution in WASM context
    - SharedArrayBuffer coordination

2. **MediaStreamSourceNode** (`src/native/nodes/media_stream_source_node.cpp`)
    - Microphone input integration

**Success Criteria:**

- AudioWorklet functional with custom processors
- Microphone input working

### Phase 8: Integration & Testing (2 weeks)

**Goals:**

- Integrate all WASM modules
- Full regression testing
- Performance benchmarking
- Documentation updates

**Deliverables:**

- Complete WASM audio engine
- All tests passing
- Performance report vs native and Rust
- Updated documentation

### Phase 9: Deployment & Distribution (1 week)

**Goals:**

- Update build system
- Update GitHub Actions CI/CD
- NPM package distribution
- Pre-built WASM binary hosting

**Build System Changes:**

```json
// package.json
{
    "scripts": {
        "build": "node scripts/build-wasm.mjs",
        "install": "node scripts/download-wasm.mjs",
        "test": "node test/basic-playback.js"
    },
    "dependencies": {
        "@kmamal/sdl": "^0.x.x"
    },
    "files": ["dist/webaudio.wasm", "src/javascript/**/*.js", "index.js"]
}
```

**GitHub Actions Changes:**

```yaml
# .github/workflows/build.yml
jobs:
    build-wasm:
        runs-on: ubuntu-latest
        steps:
            - uses: mymindstorm/setup-emsdk@v14
            - run: emcc -O3 -msimd128 ... -o dist/webaudio.wasm
            - uses: actions/upload-artifact@v4
              with:
                  name: webaudio-wasm
                  path: dist/webaudio.wasm
```

**Single build, all platforms!**

---

## Build System

### Emscripten Build Configuration

**Compiler Flags:**

```bash
emcc -O3 \
  -msimd128 \               # Enable WASM SIMD
  -pthread \                # Enable threading
  -s WASM=1 \              # Output WASM (not asm.js)
  -s ALLOW_MEMORY_GROWTH=1 \  # Dynamic memory growth
  -s MAXIMUM_MEMORY=4GB \   # Max memory limit
  -s EXPORTED_FUNCTIONS='[...]' \  # Export function list
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue"]' \
  -s MODULARIZE=1 \        # Module pattern
  -s EXPORT_ES6=1 \        # ES6 module export
  -s USE_ES6_IMPORT_META=1 \
  --no-entry \             # Library mode (no main())
  src/wasm/**/*.cpp \
  -o dist/webaudio.wasm
```

**Development Build (debugging):**

```bash
emcc -O0 -g4 \            # No optimization, full debug info
  -msimd128 \
  -s ASSERTIONS=2 \       # Runtime assertions
  -s SAFE_HEAP=1 \       # Memory safety checks
  -s STACK_OVERFLOW_CHECK=2 \
  --source-map-base http://localhost:8080/ \
  src/wasm/**/*.cpp \
  -o dist/webaudio-debug.wasm
```

### Build Script

**`scripts/build-wasm.mjs`:**

```javascript
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const sources = [
    'src/wasm/audio_graph.cpp',
    'src/wasm/audio_param.cpp',
    'src/wasm/nodes/*.cpp',
    'src/wasm/utils/*.cpp'
]
    .map(p => path.join(rootDir, p))
    .join(' ');

const flags = [
    '-O3',
    '-msimd128',
    '-pthread',
    '-s WASM=1',
    '-s ALLOW_MEMORY_GROWTH=1',
    '-s MAXIMUM_MEMORY=4GB',
    '-s MODULARIZE=1',
    '-s EXPORT_ES6=1',
    '--no-entry'
].join(' ');

console.log('Building WASM module...');

try {
    execSync(`emcc ${flags} ${sources} -o dist/webaudio.wasm`, {
        cwd: rootDir,
        stdio: 'inherit'
    });

    console.log('✅ WASM build complete: dist/webaudio.wasm');
} catch (error) {
    console.error('❌ WASM build failed:', error.message);
    process.exit(1);
}
```

### Module Loading

**JavaScript WASM Loader:**

```javascript
// src/javascript/wasm-loader.js
import wasmModule from '../dist/webaudio.wasm';

let wasmInstance = null;

export async function loadWASM() {
    if (wasmInstance) return wasmInstance;

    wasmInstance = await wasmModule();
    return wasmInstance;
}

export function getWASM() {
    if (!wasmInstance) {
        throw new Error('WASM module not loaded. Call loadWASM() first.');
    }
    return wasmInstance;
}
```

**Usage in AudioContext:**

```javascript
// src/javascript/AudioContext.js
import { loadWASM, getWASM } from './wasm-loader.js';

export class AudioContext {
    constructor(options = {}) {
        this._wasmPromise = loadWASM();
        // ... rest of initialization
    }

    async createOscillator() {
        await this._wasmPromise;
        const wasm = getWASM();

        const nodePtr = wasm._createOscillator(this.sampleRate);
        return new OscillatorNode(this, nodePtr);
    }
}
```

---

## Testing Strategy

### Unit Testing

**Approach:** Port existing tests to work with WASM backend

**Example Test Adaptation:**

```javascript
// test/waveshaper-test.js (adapted for WASM)
import { loadWASM } from '../src/javascript/wasm-loader.js';
import { OfflineAudioContext } from '../index.js';

describe('WaveShaper (WASM)', () => {
    before(async () => {
        await loadWASM(); // Ensure WASM loaded before tests
    });

    it('should apply curve correctly', async () => {
        const ctx = new OfflineAudioContext(1, 48000, 48000);
        const shaper = ctx.createWaveShaper();

        // ... test logic (unchanged)

        const buffer = await ctx.startRendering();
        // ... assertions (unchanged)
    });
});
```

### Performance Benchmarking

**Benchmark Suite Updates:**

```javascript
// webaudio-benchmarks/run-benchmarks.js
import { performance } from 'perf_hooks';

// Add WASM backend option
const BACKENDS = {
    NATIVE: 'webaudio-node', // Current N-API version
    WASM: 'webaudio-node@wasm', // WASM version
    RUST: 'node-web-audio-api' // Rust competitor
};

for (const [name, pkg] of Object.entries(BACKENDS)) {
    const { OfflineAudioContext } = await import(pkg);

    const start = performance.now();
    // ... run benchmark
    const end = performance.now();

    console.log(`${name}: ${end - start}ms`);
}
```

**Comparison Metrics:**

- WASM vs Native (measure overhead)
- WASM vs Rust (validate competitive performance)
- WASM SIMD vs WASM scalar (validate SIMD effectiveness)

### Regression Testing

**Automated Checks:**

1. All existing tests pass with WASM backend
2. Reference data validation (browser parity)
3. Performance benchmarks stay within 50% of native
4. Memory leak detection (WASM heap growth monitoring)

### Browser Compatibility Testing

**Bonus Testing:** Once WASM is working, test in browsers

**Platforms:**

- Chrome 91+ (WASM SIMD support)
- Firefox 89+ (WASM SIMD support)
- Safari 16.4+ (WASM SIMD support)
- Node.js 16+ (WASM support)

---

## Risk Assessment & Mitigation

### Risk 1: Performance Degradation

**Risk Level:** MEDIUM

**Description:** WASM overhead causes unacceptable performance loss

**Mitigation:**

- Phase 1 proof-of-concept validates approach early
- 200-3000% performance buffer provides massive headroom
- Incremental migration allows fallback to native for specific nodes if needed
- WASM SIMD optimizations minimize overhead

**Contingency:**

- Hybrid approach: Keep native builds for performance-critical nodes
- Or: Accept performance trade-off for build simplicity benefits

### Risk 2: FMA Instruction Absence

**Risk Level:** LOW-MEDIUM

**Description:** Lack of fused multiply-add in WASM hurts biquad filter performance

**Impact:** ~10% slower on filter-heavy workloads

**Mitigation:**

- Already winning on 1-4ch biquad benchmarks (8-47% faster)
- 10% overhead still leaves us competitive
- Alternative: Explore different filter topology (Direct Form II Transposed)

**Contingency:**

- If biquad performance becomes critical, implement native biquad module as WebAssembly extension

### Risk 3: Threading Complexity

**Risk Level:** MEDIUM

**Description:** WASM threads + SharedArrayBuffer coordination is complex

**Mitigation:**

- Start with single-threaded WASM (simpler)
- Add threading only if needed for performance
- Web Workers provide clean abstraction
- Extensive testing of concurrent scenarios

**Contingency:**

- Single-threaded WASM may be sufficient for most use cases
- Audio processing is naturally parallel at node level

### Risk 4: Debugging Experience

**Risk Level:** LOW

**Description:** WASM debugging less mature than native C++

**Mitigation:**

- Emscripten provides source maps for debugging
- Chrome DevTools has excellent WASM debugging support
- Keep extensive logging and assertions in debug builds
- Unit tests catch issues early

**Contingency:**

- Develop comprehensive test coverage to catch bugs without debugger
- Use printf debugging with WASM console integration

### Risk 5: Memory Management Complexity

**Risk Level:** LOW-MEDIUM

**Description:** Manual memory management in WASM can lead to leaks

**Mitigation:**

- Use RAII patterns in C++ (destructors clean up)
- Implement memory pool for audio buffers
- Extensive leak testing with heap growth monitoring
- Clear ownership rules (who allocates, who frees)

**Contingency:**

- Garbage collection via reference counting if needed
- Regular heap snapshots to detect leaks

### Risk 6: NPM Deployment Size

**Risk Level:** LOW

**Description:** WASM file size increases NPM package size

**Impact:**

- Current package: ~500KB (JavaScript + metadata)
- WASM module: ~500KB-1MB (estimated)
- Total: ~1-1.5MB

**Mitigation:**

- WASM file is highly compressible (gzip reduces by ~50%)
- Single WASM file replaces 5 platform binaries
- Users download only what they need

**Comparison:**

- Current: 5 × 2MB binaries = 10MB total (if downloading all platforms)
- WASM: 1 × 1MB = 1MB total
- **90% size reduction!**

---

## Success Criteria

### Phase 1 (Proof of Concept)

- ✅ WaveShaper WASM within 50% of native performance
- ✅ Still faster than Rust competitor
- ✅ All WaveShaper tests passing

### Phase 8 (Integration Complete)

- ✅ All 61 benchmarks measured
- ✅ Win rate ≥60% vs Rust (down from 78.7%, but acceptable)
- ✅ All existing tests passing
- ✅ No memory leaks in 10-minute stress test

### Final Deployment

- ✅ Single WASM file for all platforms
- ✅ NPM package <2MB
- ✅ Build time <5 minutes
- ✅ Zero native dependencies (no node-gyp, Python, compilers)
- ✅ GitHub Actions single-platform build

---

## Timeline & Resources

### Estimated Timeline: 26 weeks (~6 months)

| Phase                    | Duration | Dependencies | Resources   |
| ------------------------ | -------- | ------------ | ----------- |
| Phase 0: Setup           | 1 week   | None         | 1 developer |
| Phase 1: WaveShaper POC  | 2 weeks  | Phase 0      | 1 developer |
| Phase 2: Core Utilities  | 3 weeks  | Phase 1      | 1 developer |
| Phase 3: Analysis Nodes  | 3 weeks  | Phase 2      | 1 developer |
| Phase 4: Spatial/Effects | 4 weeks  | Phase 2      | 1 developer |
| Phase 5: Filters         | 4 weeks  | Phase 1, 2   | 1 developer |
| Phase 6: Source/Routing  | 3 weeks  | Phase 2      | 1 developer |
| Phase 7: AudioWorklet    | 3 weeks  | Phase 6      | 1 developer |
| Phase 8: Integration     | 2 weeks  | Phase 3-7    | 1 developer |
| Phase 9: Deployment      | 1 week   | Phase 8      | 1 developer |

**Total:** 26 weeks with 1 developer (sequential)

**Parallelization Opportunities:**

- Phases 3-7 can partially overlap (different node types)
- With 2 developers: ~16-18 weeks
- With 3 developers: ~12-14 weeks

### Critical Path

```
Phase 0 → Phase 1 → Phase 2 → Phase 3
                            ↓
                   Phase 4, 5, 6, 7 (parallel)
                            ↓
                   Phase 8 → Phase 9
```

---

## Tooling & Infrastructure

### Development Tools

**Emscripten SDK:**

```bash
# Installation
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

**Editor Support:**

- VSCode with C/C++ extension
- WebAssembly syntax highlighting
- WASM debugging support

**Profiling:**

```bash
# Chrome DevTools Performance tab
# WASM performance profiling
emcc -O3 -msimd128 --profiling -g \
  src/wasm/**/*.cpp -o dist/webaudio.wasm
```

### CI/CD Changes

**Before (5 platform builds):**

```yaml
strategy:
  matrix:
    include:
      - os: macos-latest, arch: x64
      - os: macos-latest, arch: arm64
      - os: ubuntu-latest, arch: x64
      - os: ubuntu-latest, arch: arm64
      - os: windows-latest, arch: x64
```

**After (1 build):**

```yaml
jobs:
    build-wasm:
        runs-on: ubuntu-latest
        steps:
            - uses: mymindstorm/setup-emsdk@v14
            - run: npm run build
            - uses: actions/upload-artifact@v4
```

**Deployment Simplification:**

- No more platform-specific builds
- No more GitHub release asset management
- Just publish to NPM with WASM file included

---

## Code Organization

### Directory Structure (Post-Migration)

```
webaudio-node/
├── src/
│   ├── javascript/          # JavaScript API (unchanged)
│   │   ├── AudioContext.js
│   │   ├── nodes/
│   │   └── wasm-loader.js  # NEW: WASM module loader
│   │
│   ├── wasm/               # NEW: WASM C++ source
│   │   ├── audio_engine.cpp
│   │   ├── audio_graph.cpp
│   │   ├── audio_param.cpp
│   │   ├── nodes/
│   │   │   ├── oscillator_node.cpp
│   │   │   ├── gain_node.cpp
│   │   │   ├── biquad_filter_node.cpp
│   │   │   └── ... (17 nodes)
│   │   └── utils/
│   │       ├── fft.cpp
│   │       ├── mixer.cpp
│   │       └── resampler.cpp
│   │
│   └── native/             # DEPRECATED: Remove after migration
│       └── ... (old N-API code)
│
├── dist/
│   ├── webaudio.wasm       # Compiled WASM module
│   └── webaudio.wasm.map   # Source map
│
├── scripts/
│   ├── build-wasm.mjs      # NEW: Emscripten build script
│   └── download-wasm.mjs   # NEW: Download pre-built WASM
│
├── package.json
└── emscripten-config.json  # NEW: Emscripten build config
```

---

## Next Steps

### Immediate Actions (Week 1)

1. **Install Emscripten:**

    ```bash
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    ./emsdk install latest
    ./emsdk activate latest
    ```

2. **Create Phase 1 Branch:**

    ```bash
    git checkout -b wasm-migration-phase1
    ```

3. **Extract WaveShaper Logic:**
    - Copy `src/native/nodes/wave_shaper_node.cpp` → `src/wasm/nodes/wave_shaper_node.cpp`
    - Remove N-API bindings, keep core processing logic

4. **Build Minimal WASM Module:**

    ```bash
    emcc -O3 -msimd128 \
      src/wasm/nodes/wave_shaper_node.cpp \
      -o dist/wave_shaper_poc.wasm
    ```

5. **Benchmark:**
    - Run WaveShaper benchmark with WASM backend
    - Compare: Native vs WASM vs Rust
    - Document performance delta

### Decision Point (Week 3)

**If WASM performance is acceptable (within 50% of native):**

- ✅ Proceed with full migration (Phase 2-9)
- ✅ Update project roadmap
- ✅ Communicate plan to users

**If WASM performance is unacceptable (>50% slower):**

- ⚠️ Reassess approach
- Consider hybrid (keep N-API for critical nodes)
- Or optimize WASM further before proceeding

---

## Communication Plan

### Internal Documentation

- ✅ This migration plan (docs/wasm_migration_plan.md)
- Create migration progress tracker (GitHub project board)
- Weekly status updates in CHANGELOG.md

### External Communication

**Phase 1 Complete (Week 3):**

- Blog post: "Experimenting with WebAssembly for Web Audio API"
- Share proof-of-concept results
- Invite community feedback

**Phase 8 Complete (Month 5):**

- Blog post: "webaudio-node 2.0: WASM-powered Web Audio API"
- Migration guide for users
- Performance comparison report

**Final Release (Month 6):**

- NPM major version bump (1.x → 2.x)
- GitHub release notes
- Deprecation notice for native builds

---

## Conclusion

**Migration to WASM is feasible and advantageous:**

✅ **Performance Budget:** 200-3000% headroom allows for WASM overhead
✅ **Tooling Maturity:** Emscripten, WASM SIMD, threading are production-ready
✅ **Build Simplification:** Eliminate node-gyp, Python, 5-platform builds
✅ **Deployment Simplification:** Single WASM file, all platforms
✅ **Future-Proof:** Browser compatibility, modern toolchain
✅ **Maintainability:** No native build debugging, cleaner FFI

**Risks are manageable:**

- Phase 1 POC validates approach early
- Incremental migration allows course correction
- Massive performance buffer provides safety margin

**Recommendation:** Proceed with Phase 0 (Emscripten setup) and Phase 1 (WaveShaper POC) to validate approach, then commit to full migration.
