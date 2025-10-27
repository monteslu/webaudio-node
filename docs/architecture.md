# webaudio-node Architecture Documentation

## Overview

**webaudio-node** is a high-performance Web Audio API implementation for Node.js, featuring a C++ native addon with extensive SIMD optimizations. It provides 99% spec compliance with the W3C Web Audio API specification, including real-time audio playback, OfflineAudioContext rendering, AudioWorklet support, and microphone input.

### Key Features

- **Native C++ Implementation:** High-performance audio processing using N-API bindings
- **SIMD Optimizations:** ARM NEON and x86 SSE/AVX vectorization for critical audio paths
- **SDL2 Audio Backend:** Cross-platform audio output via Simple DirectMedia Layer
- **Full Web Audio API:** Comprehensive node types, AudioParam automation, spatial audio
- **Media Decoding:** MP3/OGG/WAV support via fluent-ffmpeg
- **Real-time & Offline:** Both AudioContext and OfflineAudioContext modes

### Performance Characteristics

Current performance vs. node-web-audio-api (Rust competitor):

- **Win Rate:** 78.7% (48/61 benchmarks faster)
- **Major Wins:** WaveShaper (207-289% faster), 3D Panner (3029% faster), Convolver (294% faster)
- **Optimization Focus:** SIMD batch processing, loop unrolling, cache-aware prefetching

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                   Node.js Application                    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ JavaScript API (ES Modules)
                            ▼
┌─────────────────────────────────────────────────────────┐
│            JavaScript Layer (src/javascript/)            │
│  • AudioContext / OfflineAudioContext                    │
│  • Node Wrapper Classes (AudioNode, AudioParam)          │
│  • AudioBuffer management                                │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ N-API Bindings
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Native C++ Layer (src/native/)              │
│  • AudioEngine (real-time SDL2 callback)                 │
│  • OfflineAudioEngine (non-realtime rendering)           │
│  • AudioGraph (node graph management)                    │
│  • Audio Nodes (processing primitives)                   │
│  • SIMD-optimized utilities (FFT, mixer, resampler)      │
└───────────────────────────┬─────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │   SDL2 Audio │        │   FFmpeg     │
        │  (playback)  │        │  (decoding)  │
        └──────────────┘        └──────────────┘
```

### Component Responsibilities

#### JavaScript Layer (`src/javascript/`)

**Purpose:** Provides Web Audio API-compliant interface, manages high-level object lifecycle

**Key Files:**

- `AudioContext.js` - Real-time audio context, SDL initialization, node factory methods
- `OfflineAudioContext.js` - Non-realtime rendering context
- `AudioNode.js` - Base class for all audio nodes
- `AudioParam.js` - Parameter automation (setValueAtTime, linearRampToValueAtTime, etc.)
- `AudioBuffer.js` - Audio data container with typed array access
- `nodes/*.js` - Individual node wrapper classes

**Responsibilities:**

- API surface conformance to Web Audio spec
- Parameter validation and type coercion
- Node connection management (JavaScript graph)
- SharedArrayBuffer coordination for AudioBuffer sharing
- Event dispatching (ended, etc.)

#### Native C++ Layer (`src/native/`)

**Purpose:** High-performance audio processing, graph execution, SIMD optimization

**Core Components:**

1. **AudioEngine** (`audio_engine.cpp`)
    - Real-time audio callback integration with SDL2
    - Audio graph execution on dedicated thread
    - Buffer management and sample rate conversion
    - Microphone input handling

2. **OfflineAudioEngine** (`offline_audio_engine.cpp`)
    - Non-realtime rendering for benchmarks and offline processing
    - Precise timing control for deterministic output
    - Used by OfflineAudioContext

3. **AudioGraph** (`audio_graph.cpp`)
    - Node connection topology
    - Dependency resolution and execution order
    - Cycle detection
    - Pull-based processing model

4. **Audio Nodes** (`nodes/*.cpp`)
   Each node implements `Process(float* output, int frame_count)` for audio rendering:
    - `buffer_source_node.cpp` - Audio sample playback
    - `oscillator_node.cpp` - Waveform generation (sine, square, triangle, sawtooth)
    - `gain_node.cpp` - Volume control with automation
    - `biquad_filter_node.cpp` - IIR filters (lowpass, highpass, bandpass, etc.)
    - `delay_node.cpp` - Time-domain delay with feedback
    - `analyser_node.cpp` - FFT-based frequency/time analysis
    - `convolver_node.cpp` - Impulse response convolution (reverb)
    - `wave_shaper_node.cpp` - Nonlinear distortion
    - `dynamics_compressor_node.cpp` - Dynamic range compression
    - `panner_node.cpp` - 3D spatial audio with HRTF
    - `stereo_panner_node.cpp` - Simple stereo positioning
    - `iir_filter_node.cpp` - Arbitrary IIR filter
    - `audio_worklet_node.cpp` - Custom JavaScript audio processor
    - `media_stream_source_node.cpp` - Microphone input
    - `channel_splitter_node.cpp` / `channel_merger_node.cpp` - Channel routing

5. **Utilities** (`utils/*.cpp`)
    - `fft.cpp` - Radix-4 FFT with SIMD magnitude computation
    - `mixer.cpp` - Audio buffer mixing and channel manipulation
    - `resampler.cpp` - Sample rate conversion
    - `logger.cpp` - Debugging and diagnostics

---

## Directory Structure

```
webaudio-node/
├── index.js                    # Main entry point (ES module export)
├── package.json                # NPM package metadata, dependencies, scripts
├── binding.gyp                 # node-gyp build configuration
│
├── src/
│   ├── javascript/             # JavaScript API layer
│   │   ├── index.js           # JavaScript exports
│   │   ├── AudioContext.js
│   │   ├── OfflineAudioContext.js
│   │   ├── AudioNode.js
│   │   ├── AudioParam.js
│   │   ├── AudioBuffer.js
│   │   ├── AudioListener.js
│   │   ├── PeriodicWave.js
│   │   └── nodes/             # Node wrapper classes
│   │       ├── OscillatorNode.js
│   │       ├── GainNode.js
│   │       └── ... (18 node types)
│   │
│   └── native/                # C++ native implementation
│       ├── module.cpp         # N-API module initialization
│       ├── audio_engine.cpp   # Real-time SDL audio
│       ├── offline_audio_engine.cpp
│       ├── audio_graph.cpp    # Node graph management
│       ├── audio_param.cpp    # Automation timeline
│       ├── nodes/             # Audio processing nodes
│       │   ├── audio_node.cpp # Base node class
│       │   ├── destination_node.cpp
│       │   ├── buffer_source_node.cpp
│       │   ├── oscillator_node.cpp
│       │   ├── gain_node.cpp
│       │   ├── biquad_filter_node.cpp  # SIMD-optimized
│       │   ├── analyser_node.cpp       # SIMD-optimized
│       │   ├── wave_shaper_node.cpp    # SIMD-optimized
│       │   └── ... (15 more nodes)
│       └── utils/             # Shared utilities
│           ├── fft.cpp        # SIMD FFT implementation
│           ├── mixer.cpp
│           ├── resampler.cpp
│           └── logger.cpp
│
├── scripts/                   # Build and installation scripts
│   ├── install.mjs           # NPM install hook
│   ├── build.mjs             # Native build wrapper
│   └── download-sdl.mjs      # SDL2 library fetcher
│
├── test/                      # Test suite
│   ├── basic-playback.js     # Real-time audio test
│   ├── offline-rendering-test.js
│   ├── analyser-test.js
│   ├── analyser-reference-test.js
│   ├── waveshaper-test.js
│   ├── compressor-test.js
│   ├── panner-test.js
│   ├── reference-data/       # Browser-generated reference data
│   └── samples/              # Test audio files
│
├── docs/                      # Documentation
│   ├── README.md
│   ├── SPEC_COMPLIANCE.md
│   ├── SIMD_COMPLETE.md
│   ├── OPTIMIZATION_LOG_2025.md
│   └── architecture.md       # This file
│
├── examples/                  # Usage examples
│
├── build/                     # node-gyp build output (gitignored)
│   └── Release/
│       ├── webaudio_native.node  # Compiled addon
│       └── *.dylib            # SDL2 libraries (copied at build)
│
└── .github/
    └── workflows/
        └── build.yml         # CI/CD automation
```

---

## Dependencies

### Production Dependencies

#### @kmamal/build-sdl (local)

**Purpose:** Provides pre-compiled SDL2 binaries for macOS/Linux/Windows
**Usage:** Used at build time to locate SDL2 headers and libraries
**Location:** `file:../build-sdl` (local path dependency)

#### fluent-ffmpeg (^2.1.3)

**Purpose:** Audio file decoding (MP3, OGG, WAV)
**Usage:** Used by AudioBuffer.decodeAudioData() to convert media files to PCM
**Native Dependency:** Requires ffmpeg binary in PATH

### Development Dependencies

#### node-addon-api (^8.5.0)

**Purpose:** C++ N-API wrapper for Node.js native addons
**Usage:** Provides header-only C++ bindings for JavaScript interop
**Build Requirement:** Referenced in binding.gyp

#### node-gyp (^11.2.0)

**Purpose:** Native addon build system (Python + GYP)
**Usage:** Compiles C++ code into `.node` binary
**System Requirements:**

- Python 3.x
- C++ compiler (clang on macOS, gcc/g++ on Linux, MSVC on Windows)
- Platform-specific build tools (Xcode Command Line Tools on macOS)

### Native Library Dependencies

#### SDL2 (Simple DirectMedia Layer 2)

**Purpose:** Cross-platform audio output
**Version:** Latest from @kmamal/build-sdl
**Platforms:** macOS (dylib), Linux (so), Windows (dll)
**Build Integration:**

- Headers: `SDL_INC` environment variable
- Libraries: `SDL_LIB` environment variable
- Runtime: Copied to `build/Release/` with RPATH/loader_path

### System Dependencies

#### FFmpeg (runtime)

**Purpose:** Audio decoding via fluent-ffmpeg
**Installation:** Must be installed separately (`brew install ffmpeg`, `apt install ffmpeg`, etc.)

---

## Build System

### node-gyp Configuration (`binding.gyp`)

**Build Target:** `webaudio_native.node` (native Node.js addon)

**Source Files:** 33 C++ files compiled into single addon:

- 1 module entry point
- 3 engine/graph files
- 17 audio node implementations
- 4 utility files

**Compiler Settings:**

**macOS:**

```gyp
'cflags_cc': [
  '-std=c++17',      # C++17 standard
  '-frtti',          # RTTI for N-API
  '-O3',             # Maximum optimization
  '-flto',           # Link-time optimization
  '-ffast-math',     # Fast floating-point math
  '-march=armv8-a',  # ARM NEON instructions
  '-mtune=native'    # CPU-specific tuning
]
```

**Linux:**

```gyp
'cflags_cc': ['-std=c++17', '-frtti']
# x64: '-msse', '-msse2', '-mavx', '-mavx2', '-mfma'
# arm64: '-march=armv8-a'
```

**Windows:**

```gyp
'AdditionalOptions': ['-std:c++17']
'EnableEnhancedInstructionSet': '2'  # SSE2
```

**SIMD Support:**

- **ARM (macOS/Linux):** ARM NEON intrinsics via `<arm_neon.h>`
- **x64 (Linux/Windows):** SSE/AVX intrinsics via `<immintrin.h>`
- **Detection:** `#ifdef __ARM_NEON` / `#ifdef __AVX2__`

**SDL2 Integration:**

- Include path: `$(SDL_INC)` environment variable
- Library path: `$(SDL_LIB)` environment variable
- Runtime linking: RPATH set to `@loader_path` (macOS) or `$ORIGIN` (Linux)

### Build Scripts

#### `scripts/build.mjs`

**Purpose:** Wrapper around node-gyp that sets up SDL paths

**Process:**

1. Import `@kmamal/build-sdl` to get SDL distribution path
2. Set `SDL_INC` and `SDL_LIB` environment variables
3. Execute `npx node-gyp rebuild`
4. Copy SDL libraries to `build/Release/` directory

**Invocation:**

```bash
npm run build
```

#### `scripts/install.mjs`

**Purpose:** NPM install hook that builds native addon

**Process:**

1. Check if SDL is available
2. Run `scripts/download-sdl.mjs` if needed
3. Execute `scripts/build.mjs`

**Invocation:** Automatically runs via `npm install` (package.json `install` script)

#### `scripts/download-sdl.mjs`

**Purpose:** Fetch SDL2 binaries for current platform

**Process:**

1. Detect platform (darwin/linux/win32) and architecture (x64/arm64)
2. Download pre-built SDL2 from @kmamal/build-sdl
3. Extract to local `sdl/` directory

### Build Commands

```bash
# Full clean build
npm run build

# Development install (builds automatically)
npm install

# Manual node-gyp build (requires SDL_INC/SDL_LIB set)
npx node-gyp rebuild
```

### Build Output

**Location:** `build/Release/`

**Files:**

- `webaudio_native.node` - Compiled native addon (dylib/so/dll)
- `*.dylib` - SDL2 libraries (macOS)
- `*.so` - SDL2 libraries (Linux)
- `*.dll` - SDL2 libraries (Windows)

---

## GitHub Actions CI/CD

### Workflow: Build Native Addon (`.github/workflows/build.yml`)

**Trigger Events:**

- Tag push: `v*` (e.g., v1.0.0)
- Manual: `workflow_dispatch`

### Build Matrix

Cross-compilation matrix for 5 platform/architecture combinations:

| OS             | Architecture | Platform Identifier |
| -------------- | ------------ | ------------------- |
| macos-latest   | x64          | darwin-x64          |
| macos-latest   | arm64        | darwin-arm64        |
| ubuntu-latest  | x64          | linux-x64           |
| ubuntu-latest  | arm64        | linux-arm64         |
| windows-latest | x64          | win32-x64           |

### Build Job Steps

1. **Checkout code** (`actions/checkout@v4`)
    - Fetches repository source

2. **Setup Node.js** (`actions/setup-node@v4`)
    - Installs Node.js 20.x
    - Required for node-gyp

3. **Install dependencies**

    ```bash
    npm install --ignore-scripts
    ```

    - Installs package dependencies without running install hooks
    - Prevents premature build attempts

4. **Download SDL**

    ```bash
    node scripts/download-sdl.mjs
    ```

    - Fetches platform-specific SDL2 binaries

5. **Build native addon**

    ```bash
    node scripts/build.mjs
    ```

    - Compiles C++ code with SIMD optimizations
    - Links against SDL2

6. **Package binary**

    ```bash
    mkdir -p dist
    tar -czf dist/{platform}.tar.gz -C build/Release webaudio_native.node
    ```

    - Creates compressed tarball of compiled addon
    - Named by platform (e.g., `darwin-arm64.tar.gz`)

7. **Upload artifact** (`actions/upload-artifact@v4`)
    - Stores platform-specific build for release job

### Release Job

**Trigger:** Only runs on tag push (`refs/tags/v*`)

**Steps:**

1. **Download all artifacts** (`actions/download-artifact@v4`)
    - Collects binaries from all platform builds

2. **Create Release** (`softprops/action-gh-release@v1`)
    - Creates GitHub release for tag
    - Attaches all platform tarballs as release assets
    - Users can download pre-built binaries instead of compiling

### Deployment Strategy

**Pre-built Binaries:**

- Each release includes 5 platform-specific binaries
- Users can download and extract appropriate binary
- Avoids need for build tools (Python, compilers, etc.)

**Source Build:**

- Fallback for unsupported platforms
- Requires full build toolchain
- `npm install` triggers compilation

---

## Testing

### Test Structure

**Location:** `test/`

**Test Types:**

1. **Basic Functionality Tests**
    - `basic-playback.js` - AudioContext initialization, real-time playback
    - `offline-rendering-test.js` - OfflineAudioContext rendering
    - `buffer-sharing-test.js` - SharedArrayBuffer coordination

2. **Node-Specific Tests**
    - `analyser-test.js` - FFT computation, time/frequency data
    - `waveshaper-test.js` - Curve mapping, oversampling
    - `compressor-test.js` - Dynamics compression
    - `panner-test.js` - 3D spatialization, HRTF
    - `convolver-test.js` - Impulse response convolution

3. **Parameter Automation Tests**
    - `audioparam-modulation.js` - setValueAtTime, linearRampToValueAtTime
    - `buffer-source-params.js` - playbackRate, detune automation

4. **Reference Data Tests**
    - `analyser-reference-test.js` - Validates against browser-generated reference data
    - `reference-data/*.json` - Expected outputs from Chrome/Firefox

### Reference Testing Methodology

**Purpose:** Ensure C++ implementation matches browser behavior exactly

**Process:**

1. Generate reference data in browser (`test/generate-reference-data.html`)
2. Run same test in Node.js with native implementation
3. Compare outputs sample-by-sample (floating-point tolerance)
4. Validate FFT bins, time-domain waveforms, automation curves

**Reference Data Files:**

- `analyser-reference-data.json` - FFT outputs for various configurations
- Future: WaveShaper, Convolver, DynamicsCompressor reference data

### Running Tests

```bash
# Run basic playback test (default test script)
npm test

# Run specific test
node test/analyser-test.js
node test/offline-rendering-test.js

# Run reference validation
node test/analyser-reference-test.js
```

### Benchmark Suite

**Location:** External repository (`webaudio-benchmarks/`)

**Purpose:** Performance comparison vs. node-web-audio-api (Rust)

**Benchmarks:**

- Biquad filters (1ch, 2ch, 4ch, 6ch, 8ch)
- Analyser FFT (various sizes)
- WaveShaper oversampling (2x, 4x)
- Convolver (impulse response lengths)
- 3D Panner (HRTF processing)
- Mixing (100 sources)
- Channel operations
- Oscillators (16, various types)
- Full processing chains

**Running Benchmarks:**

```bash
cd /path/to/webaudio-benchmarks
node run-benchmarks.js
```

**Analysis Tools:**

- `/tmp/count-wins.mjs` - Win/loss counting
- `/tmp/show-losses.mjs` - Loss analysis and sorting

---

## Deployment

### NPM Publishing

**Package Name:** `webaudio-node`
**Registry:** npm public registry
**Version Strategy:** Semantic versioning (semver)

### Publication Process

1. **Update version** in `package.json`

    ```bash
    npm version patch|minor|major
    ```

2. **Commit and tag**

    ```bash
    git add package.json
    git commit -m "Release v1.0.0"
    git tag v1.0.0
    ```

3. **Push tag** (triggers CI/CD)

    ```bash
    git push origin main --tags
    ```

4. **GitHub Actions** builds binaries for all platforms

5. **Manual npm publish** (optional)
    ```bash
    npm publish
    ```

### Binary Distribution

**Pre-built Binaries:**

- Attached to GitHub releases as `.tar.gz` files
- Users download for their platform to avoid compilation

**Installation Methods:**

**Method 1: Source build** (default)

```bash
npm install webaudio-node
# Triggers scripts/install.mjs → scripts/build.mjs → node-gyp
```

**Method 2: Pre-built binary**

```bash
npm install webaudio-node --ignore-scripts
wget https://github.com/monteslu/webaudio-node/releases/download/v1.0.0/darwin-arm64.tar.gz
tar -xzf darwin-arm64.tar.gz -C node_modules/webaudio-node/build/Release/
```

### Platform Support Matrix

| Platform | Architecture | Build Status | SIMD Support |
| -------- | ------------ | ------------ | ------------ |
| macOS    | x64          | ✅ Supported | SSE, AVX     |
| macOS    | arm64        | ✅ Supported | ARM NEON     |
| Linux    | x64          | ✅ Supported | SSE, AVX     |
| Linux    | arm64        | ✅ Supported | ARM NEON     |
| Windows  | x64          | ✅ Supported | SSE          |

### Deployment Checklist

- [ ] Update version in `package.json`
- [ ] Update `docs/CHANGELOG.md`
- [ ] Run full test suite
- [ ] Run benchmark suite vs. competitor
- [ ] Create git tag (`v*`)
- [ ] Push tag to trigger CI/CD
- [ ] Verify GitHub Actions build success (all platforms)
- [ ] Download and test pre-built binaries
- [ ] Publish to npm (if not automated)
- [ ] Announce release (GitHub, npm, social media)

---

## Recent Performance Optimizations (2025-10)

### Context

Major optimization effort to achieve performance parity with node-web-audio-api (Rust implementation).

### Optimization Summary

**Overall Results:**

- **Win Rate:** 78.7% (48/61 benchmarks faster than Rust)
- **Major Wins:** 200-3000% improvements in key processing nodes
- **Remaining Challenges:** Multi-channel biquad filters (6ch, 8ch)

### Key Optimizations Implemented

#### 1. WaveShaper SIMD (8-sample batching)

**File:** `src/native/nodes/wave_shaper_node.cpp` (lines 94-170)

**Technique:** Process 8 samples at once with SIMD, fully unrolled curve lookup

**Results:**

- 2x oversampling: 207% faster (5.82ms → 1.89ms)
- 4x oversampling: 289% faster (7.82ms → 2.01ms)

**ARM NEON Code:**

```cpp
for (; i + 7 < size; i += 8) {
    float32x4_t in1 = vld1q_f32(&input[i]);
    float32x4_t in2 = vld1q_f32(&input[i + 4]);
    // Fully unrolled curve lookup (8 iterations)
}
```

#### 2. Analyser Node SIMD Optimizations

**File:** `src/native/nodes/analyser_node.cpp`

**Optimizations:**

- **Windowing (lines 123-172):** SIMD Hann window application
- **Normalization (lines 180-203):** SIMD vector normalization
- **Smoothing (lines 205-233):** SIMD temporal smoothing
- **Circular buffer (lines 94-115):** Branchless wrapping with bit masking

**Results:**

- FFT 512: 51% faster (0.82ms → 0.54ms)
- FFT 4096: 170% faster (1.46ms → 0.54ms)

#### 3. FFT Magnitude Computation SIMD

**File:** `src/native/utils/fft.cpp` (lines 275-312)

**Technique:** Process 4 complex numbers at once using `vld2q_f32()` interleaved load

**Results:** Contributes to overall FFT performance improvements

#### 4. Biquad Filter Prefetching

**File:** `src/native/nodes/biquad_filter_node.cpp`

**Optimizations:**

- **4ch (lines 322-325):** Dual prefetch strategy (next + two iterations ahead)
- **6ch (lines 437-441):** Dual prefetch strategy
- **8ch (lines 567-569):** Single prefetch to avoid cache pollution

**Results:**

- 4ch: Improved from 11% slower to 6% slower
- 8ch: Improved from 43% slower to 39% slower

### Failed Optimization Attempts (Learnings)

1. **8ch Unroll-by-8:** Excessive unrolling caused register pressure, regressed 4ch performance
2. **Analyser Byte Conversion SIMD:** Byte conversion not a bottleneck, no effect
3. **dB Conversion with std::log():** Slower than std::log10(), platform-dependent
4. **FFT Input Copy SIMD:** Input copy not a bottleneck, scalar loop sufficient
5. **FFT Radix-2 SIMD:** Too complex with lane manipulations, buggy implementation

### ARM NEON Best Practices Discovered

1. **Optimal Batch Sizes:**
    - 4 samples: Standard for most operations
    - 8 samples: Good for high arithmetic intensity (WaveShaper)
    - Beyond 8: Diminishing returns, register pressure

2. **Fused Multiply-Add Critical:**

    ```cpp
    y = vmlaq_f32(y, a, b);  // y = y + (a * b) - single instruction!
    ```

3. **Register Pressure:**
    - ARM NEON: 32 x 128-bit registers
    - Optimal unroll factor: 2-4 iterations
    - Excessive unrolling exhausts registers, forces memory spills

4. **Memory Access Patterns:**
    - Use `vld2q_f32()` for interleaved complex data
    - Prefetching helps when data >> cache
    - Alignment critical for performance

### Performance by Category

| Category           | Status          | Notes                            |
| ------------------ | --------------- | -------------------------------- |
| Mixing/Routing     | ✅ WINNING      | Large margins (100-300%)         |
| Spatial Audio      | ✅ WINNING      | Massive margins (3000%+)         |
| Effects (WS, Conv) | ✅ WINNING      | Huge margins (200-300%)          |
| Filters (1-4ch)    | ✅ WINNING      | Near-tied or winning             |
| Filters (6-8ch)    | ❌ LOSING       | 39% slower, architecture limited |
| FFT (computation)  | ✅ TIED/WINNING | Pure radix-4 winning             |
| FFT (buffer mgmt)  | ❌ LOSING       | 5-29% slower, unknown bottleneck |
| Oscillators        | ✅ WINNING      | Moderate margins (16%)           |

### Architectural Insights

**Where C++ Wins:**

- High-level graph operations (mixing, routing, spatial)
- Effects with arithmetic intensity (waveshaping, convolution)
- Large buffer processing with SIMD vectorization

**Where C++ Loses:**

- Multi-channel biquad filters (likely different topology in Rust)
- Circular buffer management (unknown architectural difference)

**Fundamental Limitations:**

- Data dependencies in IIR filters limit parallelization
- Cache behavior matters as much as computation
- Some losses appear algorithmic/architectural, not optimization-related

---

## Development Workflow

### Local Development

1. **Clone repository:**

    ```bash
    git clone https://github.com/monteslu/webaudio-node.git
    cd webaudio-node
    ```

2. **Install dependencies:**

    ```bash
    npm install
    # Automatically runs scripts/install.mjs → build.mjs
    ```

3. **Make changes** to C++ or JavaScript code

4. **Rebuild native addon:**

    ```bash
    npm run build
    ```

5. **Run tests:**

    ```bash
    npm test
    node test/analyser-test.js
    ```

6. **Run benchmarks** (external repo):
    ```bash
    cd ../webaudio-benchmarks
    node run-benchmarks.js
    ```

### Debugging

**C++ Debugging:**

```bash
# Build with debug symbols
node-gyp rebuild --debug

# macOS: lldb
lldb -- node test/basic-playback.js

# Linux: gdb
gdb --args node test/basic-playback.js
```

**JavaScript Debugging:**

```bash
node --inspect-brk test/basic-playback.js
# Open chrome://inspect in Chrome
```

**Logging:**

- C++: Use `logger.cpp` utilities
- JavaScript: Standard `console.log()`

---

## Future Architectural Considerations

Given the user's note "because i'm about to change everything", potential architectural changes might include:

1. **Alternative Build System:**
    - CMake instead of node-gyp
    - Prebuild/prebuildify for binary distribution
    - Native ES modules in C++ (experimental)

2. **Performance Architecture:**
    - Alternative biquad filter topology (Direct Form II Transposed)
    - Channel-first memory layout for multi-channel processing
    - Custom memory allocators for audio processing

3. **Platform Expansion:**
    - WebAssembly target for browser compatibility
    - Rust rewrite for memory safety
    - GPU acceleration via Metal/Vulkan/CUDA

4. **API Evolution:**
    - Worker thread pool for AudioWorklet
    - Streaming audio processing
    - WASM-based AudioWorklet processors

---

## Conclusion

**webaudio-node** is a high-performance, spec-compliant Web Audio API implementation leveraging C++ and SIMD optimizations to achieve competitive performance with Rust alternatives. The architecture balances JavaScript API compliance with native performance, using node-gyp for cross-platform builds and GitHub Actions for automated binary distribution.

**Current State:**

- ✅ 99% Web Audio spec compliance
- ✅ 78.7% performance win rate vs. Rust competitor
- ✅ Cross-platform support (macOS, Linux, Windows)
- ✅ ARM NEON and x86 SIMD optimizations
- ✅ Comprehensive test suite with reference validation

**Architecture Strengths:**

- Clean separation of JavaScript API and native processing
- Modular node architecture for extensibility
- SIMD-optimized critical paths
- Robust build and deployment system

**Known Limitations:**

- Multi-channel biquad filter performance (architectural)
- FFT buffer management overhead (under investigation)
- Build toolchain complexity (Python, compilers required)

This documentation serves as a comprehensive baseline for future architectural changes.
