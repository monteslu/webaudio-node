# Automated Benchmark Results

> **Last Updated:** 2025-10-27
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 29
- **webaudio-node Wins:** 26 (89.7%)
- **node-web-audio-api Wins:** 2 (6.9%)
- **Similar Performance (within 1%):** 1 (3.4%)
- **Average Speedup (when faster):** 2156.1%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| 3D Panner (8 sources with HRTF positioning) | 0.41 | 37.56 | 2414.0x / 27.0x | 🟢 WASM | 9061.0% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.44 | 36.24 | 2276.0x / 28.0x | 🟢 WASM | 8136.4% |
| Convolver (Reverb with 1s impulse response) | 0.33 | 26.91 | 3020.0x / 37.0x | 🟢 WASM | 8054.5% |
| Heavy Processing (Full mixing/mastering chain) | 0.22 | 16.82 | 4584.0x / 59.0x | 🟢 WASM | 7545.5% |
| Node Creation (150 nodes per iteration) | 0.08 | 5.92 | 1950.7x / 25.3x | 🟢 WASM | 7300.0% |
| Stress Test (100 sources, 400 total nodes) | 1.75 | 56.28 | 572.0x / 18.0x | 🟢 WASM | 3116.0% |
| Filter Modulation (4 oscillators with auto-wah) | 0.27 | 7.93 | 3731.0x / 126.0x | 🟢 WASM | 2837.0% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.14 | 2.33 | 7173.0x / 430.0x | 🟢 WASM | 1564.3% |
| Complex Graph (4 parallel chains) | 0.11 | 1.69 | 4400.0x / 296.0x | 🟢 WASM | 1436.4% |
| Analyser (FFT with 2048 fftSize) | 0.19 | 2.46 | 5150.0x / 406.0x | 🟢 WASM | 1194.7% |
| Filter Chain (5 cascaded filters) | 0.17 | 1.45 | 5811.0x / 690.0x | 🟢 WASM | 752.9% |
| WaveShaper (1 second with 2x oversampling) | 0.20 | 1.68 | 4913.0x / 595.0x | 🟢 WASM | 740.0% |
| Delay Modulation (4 sources with chorus effect) | 0.72 | 6.01 | 1391.0x / 166.0x | 🟢 WASM | 734.7% |
| Stereo Panner (16 sources across stereo field) | 0.80 | 5.30 | 1255.0x / 189.0x | 🟢 WASM | 562.5% |
| Filter Types (8 filter types) | 0.66 | 4.03 | 1509.0x / 248.0x | 🟢 WASM | 510.6% |
| Channel Operations (split/process/merge) | 0.23 | 1.24 | 4440.0x / 807.0x | 🟢 WASM | 439.1% |
| Multichannel (5.1 surround) | 0.77 | 4.08 | 1305.0x / 245.0x | 🟢 WASM | 429.9% |
| Gain Ramping (20 crossfades) | 0.27 | 1.19 | 3751.0x / 843.0x | 🟢 WASM | 340.7% |
| Ring Modulation (8 voices) | 1.36 | 5.64 | 733.0x / 177.0x | 🟢 WASM | 314.7% |
| ConstantSource (16 oscillators with LFO modulation) | 2.26 | 9.03 | 442.0x / 111.0x | 🟢 WASM | 299.6% |
| Delay Node (1 second with feedback) | 0.20 | 0.67 | 5024.0x / 1489.0x | 🟢 WASM | 235.0% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.21 | 3.09 | 824.0x / 324.0x | 🟢 WASM | 155.4% |
| Oscillators (16 oscillators, 4 waveform types) | 2.13 | 4.70 | 469.0x / 213.0x | 🟢 WASM | 120.7% |
| Envelope Generator (16 notes with ADSR) | 1.17 | 2.19 | 857.0x / 457.0x | 🟢 WASM | 87.2% |
| Offline Rendering (1 second of audio) | 0.43 | 0.65 | 2326.0x / 1541.0x | 🟢 WASM | 51.2% |
| AudioParam Automation (1000 events) | 0.33 | 0.46 | 0.7x / 2.0x | 🟢 WASM | 39.4% |
| Granular Synthesis (100 grains) | 16.77 | 7.17 | 60.0x / 140.0x | 🔴 Rust | 133.9% |
| Buffer Playback (50 sound effects) | 4.09 | 3.58 | 245.0x / 279.0x | 🔴 Rust | 14.2% |
| Mixing Performance (100 simultaneous sources) | 5.07 | 5.12 | 9.5x / 9.4x | 🟡 Similar | 1.0% |

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
