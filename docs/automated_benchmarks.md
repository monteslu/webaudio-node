# Automated Benchmark Results

> **Last Updated:** 2025-10-27
> **Platform:** darwin (arm64)
> **CPU:** Apple M2 Max
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 31
- **webaudio-node Wins:** 30 (96.8%)
- **node-web-audio-api Wins:** 0 (0.0%)
- **Similar Performance (within 1%):** 1 (3.2%)
- **Average Speedup (when faster):** 306.2%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 3.30 | 105.55 | 303.0x / 9.0x | 🟢 WASM | 3098.5% |
| 3D Panner (8 sources with HRTF positioning) | 3.41 | 105.46 | 294.0x / 9.0x | 🟢 WASM | 2992.7% |
| Envelope Generator (16 notes with ADSR) | 0.44 | 2.94 | 2291.0x / 340.0x | 🟢 WASM | 568.2% |
| Convolver (Reverb with 1s impulse response) | 4.29 | 17.00 | 233.0x / 59.0x | 🟢 WASM | 296.3% |
| Mixing Performance (100 simultaneous sources) | 1.93 | 7.02 | 24.9x / 6.8x | 🟢 WASM | 263.7% |
| Filter Modulation (4 oscillators with auto-wah) | 1.87 | 6.37 | 534.0x / 157.0x | 🟢 WASM | 240.6% |
| Memory Usage (100 sources, shared buffer) | 2.23 | 6.89 | 22.8x / 70.5x | 🟢 WASM | 209.0% |
| Buffer Playback (50 sound effects) | 1.20 | 3.53 | 831.0x / 283.0x | 🟢 WASM | 194.2% |
| Channel Operations (split/process/merge) | 0.50 | 1.35 | 2015.0x / 742.0x | 🟢 WASM | 170.0% |
| Multichannel (5.1 surround) | 1.62 | 4.25 | 616.0x / 235.0x | 🟢 WASM | 162.3% |
| Node Creation (150 nodes per iteration) | 1.74 | 4.47 | 86.2x / 33.6x | 🟢 WASM | 156.9% |
| Granular Synthesis (100 grains) | 2.97 | 6.58 | 336.0x / 152.0x | 🟢 WASM | 121.5% |
| WaveShaper (1 second with 2x oversampling) | 0.67 | 1.39 | 1482.0x / 718.0x | 🟢 WASM | 107.5% |
| Delay Modulation (4 sources with chorus effect) | 3.76 | 7.69 | 266.0x / 130.0x | 🟢 WASM | 104.5% |
| Offline Rendering (1 second of audio) | 0.63 | 0.98 | 1594.0x / 1022.0x | 🟢 WASM | 55.6% |
| Heavy Processing (Full mixing/mastering chain) | 11.79 | 18.22 | 85.0x / 55.0x | 🟢 WASM | 54.5% |
| Filter Chain (5 cascaded filters) | 1.07 | 1.59 | 931.0x / 630.0x | 🟢 WASM | 48.6% |
| IIR Filter (4 cascaded custom filters) | 1.96 | 2.91 | 509.0x / 343.0x | 🟢 WASM | 48.5% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.83 | 2.55 | 546.0x / 392.0x | 🟢 WASM | 39.3% |
| Delay Node (1 second with feedback) | 0.81 | 1.12 | 1229.0x / 893.0x | 🟢 WASM | 38.3% |
| AudioParam Automation (1000 events) | 0.32 | 0.42 | 1.0x / 2.1x | 🟢 WASM | 31.3% |
| Complex Graph (4 parallel chains) | 1.61 | 2.10 | 311.0x / 238.0x | 🟢 WASM | 30.4% |
| Stress Test (100 sources, 400 total nodes) | 49.78 | 64.35 | 20.0x / 16.0x | 🟢 WASM | 29.3% |
| ConstantSource (16 oscillators with LFO modulation) | 6.41 | 8.23 | 156.0x / 121.0x | 🟢 WASM | 28.4% |
| Filter Types (8 filter types) | 3.76 | 4.79 | 266.0x / 209.0x | 🟢 WASM | 27.4% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 2.44 | 3.04 | 410.0x / 329.0x | 🟢 WASM | 24.6% |
| Gain Ramping (20 crossfades) | 0.85 | 0.99 | 1183.0x / 1007.0x | 🟢 WASM | 16.5% |
| Ring Modulation (8 voices) | 5.80 | 6.48 | 172.0x / 154.0x | 🟢 WASM | 11.7% |
| Oscillators (16 oscillators, 4 waveform types) | 5.25 | 5.73 | 190.0x / 174.0x | 🟢 WASM | 9.1% |
| Stereo Panner (16 sources across stereo field) | 6.28 | 6.73 | 159.0x / 149.0x | 🟢 WASM | 7.2% |
| Analyser (FFT with 2048 fftSize) | 2.30 | 2.30 | 434.0x / 435.0x | 🟡 Similar | 0.0% |

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
