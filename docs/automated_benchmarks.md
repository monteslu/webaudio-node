# Automated Benchmark Results

> **Last Updated:** 2025-10-27
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 29
- **webaudio-node Wins:** 27 (93.1%)
- **node-web-audio-api Wins:** 2 (6.9%)
- **Similar Performance (within 1%):** 0 (0.0%)
- **Average Speedup (when faster):** 2248.3%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Node Creation (150 nodes per iteration) | 0.06 | 6.10 | 2445.0x / 24.6x | 🟢 WASM | 10066.7% |
| 3D Panner (8 sources with HRTF positioning) | 0.40 | 38.00 | 2491.0x / 26.0x | 🟢 WASM | 9400.0% |
| Convolver (Reverb with 1s impulse response) | 0.31 | 26.46 | 3249.0x / 38.0x | 🟢 WASM | 8435.5% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.44 | 36.41 | 2295.0x / 27.0x | 🟢 WASM | 8175.0% |
| Heavy Processing (Full mixing/mastering chain) | 0.23 | 15.87 | 4255.0x / 63.0x | 🟢 WASM | 6800.0% |
| Stress Test (100 sources, 400 total nodes) | 1.79 | 56.07 | 559.0x / 18.0x | 🟢 WASM | 3032.4% |
| Filter Modulation (4 oscillators with auto-wah) | 0.28 | 7.71 | 3521.0x / 130.0x | 🟢 WASM | 2653.6% |
| Analyser (FFT with 2048 fftSize) | 0.17 | 3.13 | 5728.0x / 320.0x | 🟢 WASM | 1741.2% |
| Complex Graph (4 parallel chains) | 0.10 | 1.77 | 4899.0x / 283.0x | 🟢 WASM | 1670.0% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.14 | 2.30 | 6979.0x / 436.0x | 🟢 WASM | 1542.9% |
| Filter Types (8 filter types) | 0.49 | 7.10 | 2021.0x / 141.0x | 🟢 WASM | 1349.0% |
| Filter Chain (5 cascaded filters) | 0.15 | 1.38 | 6476.0x / 727.0x | 🟢 WASM | 820.0% |
| Delay Modulation (4 sources with chorus effect) | 0.72 | 5.75 | 1386.0x / 174.0x | 🟢 WASM | 698.6% |
| Multichannel (5.1 surround) | 0.55 | 4.27 | 1827.0x / 234.0x | 🟢 WASM | 676.4% |
| Channel Operations (split/process/merge) | 0.16 | 1.17 | 6327.0x / 852.0x | 🟢 WASM | 631.2% |
| WaveShaper (1 second with 2x oversampling) | 0.16 | 1.15 | 6175.0x / 872.0x | 🟢 WASM | 618.7% |
| Stereo Panner (16 sources across stereo field) | 0.80 | 5.36 | 1255.0x / 187.0x | 🟢 WASM | 570.0% |
| Gain Ramping (20 crossfades) | 0.27 | 1.20 | 3712.0x / 834.0x | 🟢 WASM | 344.4% |
| Ring Modulation (8 voices) | 1.39 | 5.73 | 719.0x / 175.0x | 🟢 WASM | 312.2% |
| Delay Node (1 second with feedback) | 0.17 | 0.65 | 5767.0x / 1527.0x | 🟢 WASM | 282.4% |
| ConstantSource (16 oscillators with LFO modulation) | 2.33 | 8.19 | 429.0x / 122.0x | 🟢 WASM | 251.5% |
| Oscillators (16 oscillators, 4 waveform types) | 2.19 | 6.95 | 457.0x / 144.0x | 🟢 WASM | 217.4% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.15 | 3.43 | 866.0x / 292.0x | 🟢 WASM | 198.3% |
| Envelope Generator (16 notes with ADSR) | 1.17 | 2.18 | 852.0x / 458.0x | 🟢 WASM | 86.3% |
| AudioParam Automation (1000 events) | 0.29 | 0.51 | 0.7x / 2.1x | 🟢 WASM | 75.9% |
| Offline Rendering (1 second of audio) | 0.52 | 0.69 | 1937.0x / 1445.0x | 🟢 WASM | 32.7% |
| Mixing Performance (100 simultaneous sources) | 4.77 | 5.79 | 10.1x / 8.3x | 🟢 WASM | 21.4% |
| Granular Synthesis (100 grains) | 16.04 | 5.68 | 62.0x / 176.0x | 🔴 Rust | 182.4% |
| Buffer Playback (50 sound effects) | 4.15 | 3.56 | 241.0x / 281.0x | 🔴 Rust | 16.6% |

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
