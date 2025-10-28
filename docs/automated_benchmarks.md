# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 25
- **webaudio-node Wins:** 22 (88.0%)
- **node-web-audio-api Wins:** 3 (12.0%)
- **Similar Performance (within 1%):** 0 (0.0%)
- **Average Speedup (when faster):** 256.1%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 2.74 | 36.73 | 365.0x / 27.0x | 🟢 WASM | 1240.5% |
| 3D Panner (8 sources with HRTF positioning) | 2.86 | 38.05 | 349.0x / 26.0x | 🟢 WASM | 1230.4% |
| Filter Modulation (4 oscillators with auto-wah) | 1.31 | 7.72 | 765.0x / 130.0x | 🟢 WASM | 489.3% |
| Delay Modulation (4 sources with chorus effect) | 0.98 | 5.74 | 1025.0x / 174.0x | 🟢 WASM | 485.7% |
| Complex Graph (4 parallel chains) | 0.38 | 1.70 | 1323.0x / 295.0x | 🟢 WASM | 347.4% |
| Ring Modulation (8 voices) | 1.40 | 5.80 | 713.0x / 173.0x | 🟢 WASM | 314.3% |
| Analyser (FFT with 2048 fftSize) | 0.76 | 2.51 | 1314.0x / 398.0x | 🟢 WASM | 230.3% |
| Gain Ramping (20 crossfades) | 0.40 | 1.27 | 2528.0x / 784.0x | 🟢 WASM | 217.5% |
| ConstantSource (16 oscillators with LFO modulation) | 2.72 | 7.66 | 368.0x / 131.0x | 🟢 WASM | 181.6% |
| Envelope Generator (16 notes with ADSR) | 1.13 | 2.97 | 885.0x / 336.0x | 🟢 WASM | 162.8% |
| Oscillators (16 oscillators, 4 waveform types) | 2.25 | 4.83 | 444.0x / 207.0x | 🟢 WASM | 114.7% |
| Offline Rendering (1 second of audio) | 0.43 | 0.87 | 2316.0x / 1146.0x | 🟢 WASM | 102.3% |
| WaveShaper (1 second with 2x oversampling) | 0.61 | 1.12 | 1646.0x / 896.0x | 🟢 WASM | 83.6% |
| Stereo Panner (16 sources across stereo field) | 3.15 | 5.67 | 317.0x / 176.0x | 🟢 WASM | 80.0% |
| Channel Operations (split/process/merge) | 0.64 | 1.15 | 1558.0x / 866.0x | 🟢 WASM | 79.7% |
| Delay Node (1 second with feedback) | 0.52 | 0.82 | 1912.0x / 1218.0x | 🟢 WASM | 57.7% |
| AudioParam Automation (1000 events) | 0.29 | 0.45 | 0.7x / 2.0x | 🟢 WASM | 55.2% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.45 | 2.24 | 691.0x / 446.0x | 🟢 WASM | 54.5% |
| Filter Types (8 filter types) | 2.83 | 3.99 | 353.0x / 250.0x | 🟢 WASM | 41.0% |
| Stress Test (100 sources, 400 total nodes) | 42.87 | 59.98 | 23.0x / 17.0x | 🟢 WASM | 39.9% |
| Filter Chain (5 cascaded filters) | 1.13 | 1.36 | 883.0x / 736.0x | 🟢 WASM | 20.4% |
| Mixing Performance (100 simultaneous sources) | 4.88 | 5.18 | 9.8x / 9.3x | 🟢 WASM | 6.1% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 401.80 | 64.20 | 19.5x / 11.0x | 🔴 Rust | 525.9% |
| Multichannel (5.1 surround) | 6.32 | 4.27 | 158.0x / 234.0x | 🔴 Rust | 48.0% |
| Node Creation (150 nodes per iteration) | 7.06 | 5.68 | 21.2x / 26.4x | 🔴 Rust | 24.3% |

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
