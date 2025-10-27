# Automated Benchmark Results

> **⚠️ DEPRECATED:** These results test the **legacy native C++ implementation**, NOT the WASM implementation.
>
> **For WASM benchmark results, see the main [README.md](../README.md#-performance)**

> **Last Updated:** 2025-10-27
> **Platform:** darwin (arm64)
> **CPU:** Apple M2 Max
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node native C++ addon** and **node-web-audio-api** (pure Rust implementation).

**Note:** These benchmarks test the legacy C++ implementation with native addons. The current WASM implementation only supports a subset of nodes (Oscillator, Gain, BufferSource). For accurate WASM performance data, see the core benchmarks in the main README.

### Summary Statistics

- **Total Benchmarks:** 31
- **webaudio-node (native C++) Wins:** 29 (93.5%)
- **node-web-audio-api Wins:** 2 (6.5%)
- **Similar Performance (within 1%):** 0 (0.0%)
- **Average Speedup (when faster):** 2331.9%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| 3D Panner (8 sources with HRTF positioning) | 0.60 | 109.16 | 1665.0x / 9.0x | 🟢 WASM | 18093.3% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.62 | 104.85 | 1626.0x / 10.0x | 🟢 WASM | 16811.3% |
| Heavy Processing (Full mixing/mastering chain) | 0.23 | 18.08 | 4387.0x / 55.0x | 🟢 WASM | 7760.9% |
| Node Creation (150 nodes per iteration) | 0.06 | 4.60 | 2592.4x / 32.6x | 🟢 WASM | 7566.7% |
| Convolver (Reverb with 1s impulse response) | 0.43 | 18.23 | 2336.0x / 55.0x | 🟢 WASM | 4139.5% |
| Stress Test (100 sources, 400 total nodes) | 2.13 | 64.10 | 469.0x / 16.0x | 🟢 WASM | 2909.4% |
| Filter Modulation (4 oscillators with auto-wah) | 0.43 | 6.29 | 2345.0x / 159.0x | 🟢 WASM | 1362.8% |
| Complex Graph (4 parallel chains) | 0.14 | 2.02 | 3673.0x / 248.0x | 🟢 WASM | 1342.9% |
| IIR Filter (4 cascaded custom filters) | 0.24 | 2.88 | 4241.0x / 347.0x | 🟢 WASM | 1100.0% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.19 | 2.00 | 5323.0x / 501.0x | 🟢 WASM | 952.6% |
| Analyser (FFT with 2048 fftSize) | 0.25 | 2.24 | 4044.0x / 446.0x | 🟢 WASM | 796.0% |
| Filter Types (8 filter types) | 0.66 | 4.71 | 1514.0x / 212.0x | 🟢 WASM | 613.6% |
| Filter Chain (5 cascaded filters) | 0.24 | 1.59 | 4206.0x / 629.0x | 🟢 WASM | 562.5% |
| Delay Modulation (4 sources with chorus effect) | 1.11 | 7.07 | 903.0x / 141.0x | 🟢 WASM | 536.9% |
| WaveShaper (1 second with 2x oversampling) | 0.22 | 1.39 | 4637.0x / 721.0x | 🟢 WASM | 531.8% |
| Stereo Panner (16 sources across stereo field) | 1.18 | 6.72 | 844.0x / 149.0x | 🟢 WASM | 469.5% |
| Multichannel (5.1 surround) | 0.85 | 4.25 | 1170.0x / 235.0x | 🟢 WASM | 400.0% |
| Channel Operations (split/process/merge) | 0.28 | 1.30 | 3611.0x / 768.0x | 🟢 WASM | 364.3% |
| Delay Node (1 second with feedback) | 0.22 | 0.89 | 4618.0x / 1127.0x | 🟢 WASM | 304.5% |
| Ring Modulation (8 voices) | 2.21 | 6.40 | 452.0x / 156.0x | 🟢 WASM | 189.6% |
| Offline Rendering (1 second of audio) | 0.33 | 0.95 | 2991.0x / 1057.0x | 🟢 WASM | 187.9% |
| Gain Ramping (20 crossfades) | 0.39 | 1.05 | 2575.0x / 952.0x | 🟢 WASM | 169.2% |
| Memory Usage (100 sources, shared buffer) | 2.27 | 5.39 | 23.2x / 55.2x | 🟢 WASM | 137.4% |
| ConstantSource (16 oscillators with LFO modulation) | 3.52 | 8.28 | 284.0x / 121.0x | 🟢 WASM | 135.2% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.85 | 3.14 | 540.0x / 319.0x | 🟢 WASM | 69.7% |
| Oscillators (16 oscillators, 4 waveform types) | 3.60 | 5.63 | 278.0x / 177.0x | 🟢 WASM | 56.4% |
| Envelope Generator (16 notes with ADSR) | 1.63 | 2.50 | 615.0x / 401.0x | 🟢 WASM | 53.4% |
| AudioParam Automation (1000 events) | 0.39 | 0.41 | 1.2x / 2.2x | 🟢 WASM | 5.1% |
| Mixing Performance (100 simultaneous sources) | 6.76 | 6.93 | 7.1x / 6.9x | 🟢 WASM | 2.5% |
| Granular Synthesis (100 grains) | 21.80 | 7.68 | 46.0x / 130.0x | 🔴 Rust | 183.9% |
| Buffer Playback (50 sound effects) | 5.77 | 3.63 | 173.0x / 275.0x | 🔴 Rust | 59.0% |

## Interpretation

- **Render Time (ms):** Time taken to render 1 second of audio. Lower is better.
- **Realtime Multiplier:** How many times faster than realtime the rendering is. Higher is better.
  - Example: 100x means it can render 100 seconds of audio in 1 second
- **🟢 WASM:** webaudio-node is faster for this benchmark
- **🔴 Rust:** node-web-audio-api is faster for this benchmark
- **🟡 Similar:** Performance difference is within 1% (essentially equivalent)

## Notes

These benchmarks measure offline rendering performance, which is different from realtime audio playback. Results may vary based on:
- Hardware (CPU, memory)
- Operating system
- Node.js version
- System load during testing

Both implementations are capable of realtime audio processing as indicated by realtime multipliers significantly greater than 1.0x.
