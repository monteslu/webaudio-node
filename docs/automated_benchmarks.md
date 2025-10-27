# Automated Benchmark Results

> **Last Updated:** 2025-10-27
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 31
- **webaudio-node Wins:** 28 (90.3%)
- **node-web-audio-api Wins:** 3 (9.7%)
- **Similar Performance (within 1%):** 0 (0.0%)
- **Average Speedup (when faster):** 2278.1%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Node Creation (150 nodes per iteration) | 0.05 | 6.20 | 2795.0x / 24.2x | 🟢 WASM | 12300.0% |
| 3D Panner (8 sources with HRTF positioning) | 0.43 | 38.80 | 2301.0x / 26.0x | 🟢 WASM | 8923.3% |
| Convolver (Reverb with 1s impulse response) | 0.33 | 28.43 | 3045.0x / 35.0x | 🟢 WASM | 8515.2% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.46 | 36.17 | 2151.0x / 28.0x | 🟢 WASM | 7763.0% |
| Heavy Processing (Full mixing/mastering chain) | 0.23 | 15.89 | 4432.0x / 63.0x | 🟢 WASM | 6808.7% |
| Stress Test (100 sources, 400 total nodes) | 1.72 | 57.02 | 580.0x / 18.0x | 🟢 WASM | 3215.1% |
| Filter Modulation (4 oscillators with auto-wah) | 0.28 | 8.28 | 3577.0x / 121.0x | 🟢 WASM | 2857.1% |
| Complex Graph (4 parallel chains) | 0.10 | 1.82 | 5026.0x / 275.0x | 🟢 WASM | 1720.0% |
| Analyser (FFT with 2048 fftSize) | 0.15 | 2.45 | 6563.0x / 409.0x | 🟢 WASM | 1533.3% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.15 | 2.35 | 6708.0x / 426.0x | 🟢 WASM | 1466.7% |
| Multichannel (5.1 surround) | 0.60 | 8.33 | 1656.0x / 120.0x | 🟢 WASM | 1288.3% |
| IIR Filter (4 cascaded custom filters) | 0.23 | 3.19 | 4347.0x / 313.0x | 🟢 WASM | 1287.0% |
| WaveShaper (1 second with 2x oversampling) | 0.17 | 1.72 | 5780.0x / 580.0x | 🟢 WASM | 911.8% |
| Filter Chain (5 cascaded filters) | 0.16 | 1.41 | 6138.0x / 708.0x | 🟢 WASM | 781.3% |
| Filter Types (8 filter types) | 0.56 | 4.74 | 1785.0x / 211.0x | 🟢 WASM | 746.4% |
| Delay Modulation (4 sources with chorus effect) | 0.72 | 5.74 | 1391.0x / 174.0x | 🟢 WASM | 697.2% |
| Channel Operations (split/process/merge) | 0.18 | 1.24 | 5636.0x / 805.0x | 🟢 WASM | 588.9% |
| Stereo Panner (16 sources across stereo field) | 0.88 | 5.26 | 1138.0x / 190.0x | 🟢 WASM | 497.7% |
| Ring Modulation (8 voices) | 1.39 | 6.25 | 718.0x / 160.0x | 🟢 WASM | 349.6% |
| Gain Ramping (20 crossfades) | 0.31 | 1.29 | 3219.0x / 774.0x | 🟢 WASM | 316.1% |
| Offline Rendering (1 second of audio) | 0.23 | 0.88 | 4364.0x / 1139.0x | 🟢 WASM | 282.6% |
| ConstantSource (16 oscillators with LFO modulation) | 2.40 | 8.26 | 416.0x / 121.0x | 🟢 WASM | 244.2% |
| Delay Node (1 second with feedback) | 0.19 | 0.63 | 5209.0x / 1581.0x | 🟢 WASM | 231.6% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.17 | 3.34 | 858.0x / 299.0x | 🟢 WASM | 185.5% |
| Oscillators (16 oscillators, 4 waveform types) | 2.17 | 4.85 | 460.0x / 206.0x | 🟢 WASM | 123.5% |
| Envelope Generator (16 notes with ADSR) | 1.14 | 2.51 | 879.0x / 399.0x | 🟢 WASM | 120.2% |
| Mixing Performance (100 simultaneous sources) | 4.74 | 6.04 | 10.1x / 8.0x | 🟢 WASM | 27.4% |
| AudioParam Automation (1000 events) | 0.47 | 0.49 | 0.7x / 2.3x | 🟢 WASM | 4.3% |
| Granular Synthesis (100 grains) | 16.31 | 5.86 | 61.0x / 171.0x | 🔴 Rust | 178.3% |
| Memory Usage (100 sources, shared buffer) | 11.34 | 5.04 | 116.1x / 51.6x | 🔴 Rust | 125.0% |
| Buffer Playback (50 sound effects) | 4.34 | 3.90 | 230.0x / 257.0x | 🔴 Rust | 11.3% |

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

### Additional Quality Considerations

**Audio Resampling Quality:**
- **webaudio-node** uses Speex resampler quality level 3 (same as Firefox) - production-quality resampling with SIMD optimizations
- **node-web-audio-api** uses basic linear interpolation - much lower quality but faster
- These benchmarks do NOT include resampling operations, so performance may differ when sample rate conversion is required
- For resampling-heavy workloads, webaudio-node prioritizes audio quality over raw speed

**Node Coverage:**
- **webaudio-node** implements 16/17 applicable Web Audio API nodes (94% coverage)
- **node-web-audio-api** node coverage may vary
