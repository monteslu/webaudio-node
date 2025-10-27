# Web Audio Node.js Performance Benchmarks

Performance comparison between Node.js Web Audio API implementations:
- **webaudio-node** (C++ with SIMD optimizations)
- **node-web-audio-api** (Rust-based implementation)

Both are excellent libraries. These benchmarks help identify optimization opportunities and demonstrate different architectural approaches.

## Quick Results

**webaudio-node wins 15/21 benchmarks (71%)**

Major wins (>100% faster):
- Mixing: +234%
- Buffer Playback: +181%
- Node Creation: +164%
- WaveShaper: +152%
- Channel Operations: +138%
- Automation: +113%

See [BENCHMARK_SUMMARY.md](BENCHMARK_SUMMARY.md) for detailed results.

## Setup

```bash
# Install dependencies
npm install

# Link local webaudio-node
cd ../webaudio-node && npm link
cd ../webaudio-benchmarks && npm link webaudio-node
```

## Run Benchmarks

```bash
npm run bench
# or
node run-benchmarks.js
```

## Benchmark Categories

### Core Processing (4 tests)
- **Offline Rendering** - Basic context rendering
- **Mixing** - 100 simultaneous sources (webaudio-node +234%)
- **Buffer Playback** - 50 sound effects (webaudio-node +181%)
- **Delay** - Delay node with feedback (tied)

### Filters & Effects (5 tests)
- **Filter Chain** - 5 cascaded biquad filters (webaudio-node +30%)
- **WaveShaper** - Non-linear distortion (webaudio-node +152%)
- **Convolver** - Reverb/impulse response (webaudio-node +30%)
- **Compressor** - Dynamics compression (webaudio-node +21%)
- **Analyser** - FFT spectrum analysis (webaudio-node +7%)

### Channel & Routing (3 tests)
- **Channel Operations** - Split/process/merge (webaudio-node +138%)
- **Stereo Panner** - 16 sources (webaudio-node +28%)
- **3D Panner** - HRTF positioning (FAILED - needs AudioListener)

### Parameters & Automation (1 test)
- **Automation** - 1000 scheduled events (webaudio-node +113%)

### Graph Management (4 tests)
- **Node Creation** - 150 nodes per iteration (webaudio-node +164%)
- **Complex Graph** - 4 parallel chains (webaudio-node +21%)
- **Heavy Processing** - 36-node mastering chain (node-web-audio-api +4%)
- **Stress Test** - 400 total nodes (webaudio-node +38%)

### Source Generation (2 tests)
- **Oscillators** - 16 oscillators, 4 types (webaudio-node +21%)
- **IIR Filter** - 4 cascaded custom filters (webaudio-node +45%)

### Format Support (1 test)
- **MP3 Processing** - Decode + process (node-web-audio-api +153%, known limitation)

### Resource Usage (1 test)
- **Memory Usage** - Shared buffers (FAILED - reporting issue)

## Results Format

Results are displayed as comparison tables with:
- Absolute performance values (ms, samples/sec, realtime multiplier)
- Side-by-side comparison
- Winner highlighted for each benchmark

## Key Optimizations (webaudio-node)

1. **SIMD Vectorization** - ARM NEON for 4-sample parallel processing
2. **Fast Math** - Polynomial approximations (3-5x faster)
3. **Zero-Copy** - Avoid unnecessary allocations
4. **Register Caching** - Keep state in CPU registers
5. **GetChannels() Caching** - Prevent O(N²) recursion
6. **Radix-4 FFT** - 2 bits per stage vs Radix-2's 1 bit
7. **Direct Form II Transposed** - Optimized IIR filter structure

## Respectful Note

**node-web-audio-api** is an excellent library with:
- Outstanding MP3 decoding
- Full Web Audio API spec compliance
- Excellent LLVM optimizations
- Active development

Both libraries serve different use cases and excel in different scenarios.
