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
- **Average Speedup (when faster):** 2176.7%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 0.43 | 39.59 | 2312.0x / 25.0x | 🟢 WASM | 9107.0% |
| Node Creation (150 nodes per iteration) | 0.07 | 6.06 | 2214.8x / 24.7x | 🟢 WASM | 8557.1% |
| Convolver (Reverb with 1s impulse response) | 0.31 | 26.65 | 3269.0x / 38.0x | 🟢 WASM | 8496.8% |
| Heavy Processing (Full mixing/mastering chain) | 0.20 | 16.10 | 4929.0x / 62.0x | 🟢 WASM | 7950.0% |
| 3D Panner (8 sources with HRTF positioning) | 0.60 | 38.81 | 1670.0x / 26.0x | 🟢 WASM | 6368.3% |
| Stress Test (100 sources, 400 total nodes) | 1.65 | 56.48 | 605.0x / 18.0x | 🟢 WASM | 3323.0% |
| Filter Modulation (4 oscillators with auto-wah) | 0.26 | 7.62 | 3798.0x / 131.0x | 🟢 WASM | 2830.8% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.15 | 3.29 | 6528.0x / 304.0x | 🟢 WASM | 2093.3% |
| Analyser (FFT with 2048 fftSize) | 0.15 | 3.10 | 6883.0x / 323.0x | 🟢 WASM | 1966.7% |
| Complex Graph (4 parallel chains) | 0.12 | 2.10 | 4212.0x / 239.0x | 🟢 WASM | 1650.0% |
| Multichannel (5.1 surround) | 0.57 | 6.66 | 1756.0x / 150.0x | 🟢 WASM | 1068.4% |
| Filter Chain (5 cascaded filters) | 0.16 | 1.38 | 6440.0x / 727.0x | 🟢 WASM | 762.5% |
| Delay Modulation (4 sources with chorus effect) | 0.71 | 5.92 | 1407.0x / 169.0x | 🟢 WASM | 733.8% |
| Channel Operations (split/process/merge) | 0.16 | 1.21 | 6362.0x / 826.0x | 🟢 WASM | 656.3% |
| Filter Types (8 filter types) | 0.54 | 3.96 | 1840.0x / 252.0x | 🟢 WASM | 633.3% |
| WaveShaper (1 second with 2x oversampling) | 0.20 | 1.22 | 4956.0x / 820.0x | 🟢 WASM | 510.0% |
| Stereo Panner (16 sources across stereo field) | 1.15 | 5.42 | 872.0x / 184.0x | 🟢 WASM | 371.3% |
| Gain Ramping (20 crossfades) | 0.28 | 1.18 | 3575.0x / 851.0x | 🟢 WASM | 321.4% |
| Ring Modulation (8 voices) | 1.44 | 5.60 | 692.0x / 179.0x | 🟢 WASM | 288.9% |
| ConstantSource (16 oscillators with LFO modulation) | 2.26 | 7.59 | 442.0x / 132.0x | 🟢 WASM | 235.8% |
| Offline Rendering (1 second of audio) | 0.22 | 0.63 | 4532.0x / 1598.0x | 🟢 WASM | 186.4% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.13 | 3.19 | 881.0x / 314.0x | 🟢 WASM | 182.3% |
| Delay Node (1 second with feedback) | 0.24 | 0.63 | 4146.0x / 1575.0x | 🟢 WASM | 162.5% |
| Envelope Generator (16 notes with ADSR) | 1.13 | 2.57 | 882.0x / 389.0x | 🟢 WASM | 127.4% |
| Oscillators (16 oscillators, 4 waveform types) | 2.12 | 4.80 | 471.0x / 208.0x | 🟢 WASM | 126.4% |
| AudioParam Automation (1000 events) | 0.28 | 0.41 | 0.7x / 2.0x | 🟢 WASM | 46.4% |
| Mixing Performance (100 simultaneous sources) | 4.71 | 5.46 | 10.2x / 8.8x | 🟢 WASM | 15.9% |
| Granular Synthesis (100 grains) | 17.13 | 5.62 | 58.0x / 178.0x | 🔴 Rust | 204.8% |
| Buffer Playback (50 sound effects) | 4.19 | 3.43 | 239.0x / 292.0x | 🔴 Rust | 22.2% |

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
