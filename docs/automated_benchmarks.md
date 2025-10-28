# Automated Benchmark Results

> **Last Updated:** 2025-10-27
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 27
- **webaudio-node Wins:** 25 (92.6%)
- **node-web-audio-api Wins:** 2 (7.4%)
- **Similar Performance (within 1%):** 0 (0.0%)
- **Average Speedup (when faster):** 1091.3%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 0.26 | 36.21 | 3860.0x / 28.0x | 🟢 WASM | 13826.9% |
| Convolver (Reverb with 1s impulse response) | 0.54 | 29.12 | 1837.0x / 34.0x | 🟢 WASM | 5292.6% |
| Multichannel (5.1 surround) | 0.43 | 7.39 | 2300.0x / 135.0x | 🟢 WASM | 1618.6% |
| 3D Panner (8 sources with HRTF positioning) | 2.79 | 40.08 | 358.0x / 25.0x | 🟢 WASM | 1336.6% |
| Filter Types (8 filter types) | 0.31 | 4.40 | 3272.0x / 227.0x | 🟢 WASM | 1319.4% |
| Delay Modulation (4 sources with chorus effect) | 0.81 | 5.96 | 1237.0x / 168.0x | 🟢 WASM | 635.8% |
| Analyser (FFT with 2048 fftSize) | 0.50 | 3.49 | 1995.0x / 287.0x | 🟢 WASM | 598.0% |
| Filter Modulation (4 oscillators with auto-wah) | 1.39 | 7.81 | 721.0x / 128.0x | 🟢 WASM | 461.9% |
| Gain Ramping (20 crossfades) | 0.27 | 1.24 | 3688.0x / 805.0x | 🟢 WASM | 359.3% |
| Complex Graph (4 parallel chains) | 0.41 | 1.68 | 1231.0x / 297.0x | 🟢 WASM | 309.8% |
| ConstantSource (16 oscillators with LFO modulation) | 2.49 | 7.90 | 401.0x / 127.0x | 🟢 WASM | 217.3% |
| Heavy Processing (Full mixing/mastering chain) | 5.54 | 16.28 | 180.0x / 61.0x | 🟢 WASM | 193.9% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.19 | 3.29 | 839.0x / 304.0x | 🟢 WASM | 176.5% |
| Ring Modulation (8 voices) | 2.16 | 5.70 | 464.0x / 175.0x | 🟢 WASM | 163.9% |
| AudioParam Automation (1000 events) | 0.21 | 0.48 | 0.5x / 2.2x | 🟢 WASM | 128.6% |
| Delay Node (1 second with feedback) | 0.54 | 1.20 | 1861.0x / 834.0x | 🟢 WASM | 122.2% |
| Channel Operations (split/process/merge) | 0.64 | 1.29 | 1568.0x / 775.0x | 🟢 WASM | 101.6% |
| Oscillators (16 oscillators, 4 waveform types) | 2.57 | 4.97 | 389.0x / 201.0x | 🟢 WASM | 93.4% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.32 | 2.28 | 760.0x / 438.0x | 🟢 WASM | 72.7% |
| Envelope Generator (16 notes with ADSR) | 1.36 | 2.29 | 733.0x / 436.0x | 🟢 WASM | 68.4% |
| Stereo Panner (16 sources across stereo field) | 3.18 | 5.28 | 315.0x / 190.0x | 🟢 WASM | 66.0% |
| Offline Rendering (1 second of audio) | 0.44 | 0.66 | 2249.0x / 1509.0x | 🟢 WASM | 50.0% |
| Stress Test (100 sources, 400 total nodes) | 43.04 | 57.09 | 23.0x / 18.0x | 🟢 WASM | 32.6% |
| Filter Chain (5 cascaded filters) | 1.15 | 1.44 | 867.0x / 695.0x | 🟢 WASM | 25.2% |
| Mixing Performance (100 simultaneous sources) | 4.66 | 5.19 | 10.3x / 9.3x | 🟢 WASM | 11.4% |
| Node Creation (150 nodes per iteration) | 7.12 | 6.01 | 21.1x / 25.0x | 🔴 Rust | 18.5% |
| Buffer Playback (50 sound effects) | 4.64 | 4.56 | 215.0x / 220.0x | 🔴 Rust | 1.8% |

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
