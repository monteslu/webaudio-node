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
- **node-web-audio-api Wins:** 3 (10.3%)
- **Similar Performance (within 1%):** 0 (0.0%)
- **Average Speedup (when faster):** 2058.0%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| 3D Panner (8 sources with HRTF positioning) | 0.44 | 38.70 | 2280.0x / 26.0x | 🟢 WASM | 8695.5% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.42 | 36.70 | 2379.0x / 27.0x | 🟢 WASM | 8638.1% |
| Node Creation (150 nodes per iteration) | 0.07 | 5.84 | 2289.1x / 25.7x | 🟢 WASM | 8242.9% |
| Heavy Processing (Full mixing/mastering chain) | 0.30 | 16.46 | 3355.0x / 61.0x | 🟢 WASM | 5386.7% |
| Convolver (Reverb with 1s impulse response) | 0.34 | 17.39 | 2900.0x / 57.0x | 🟢 WASM | 5014.7% |
| Stress Test (100 sources, 400 total nodes) | 1.70 | 56.36 | 588.0x / 18.0x | 🟢 WASM | 3215.3% |
| Filter Modulation (4 oscillators with auto-wah) | 0.26 | 7.68 | 3853.0x / 130.0x | 🟢 WASM | 2853.8% |
| Complex Graph (4 parallel chains) | 0.12 | 2.35 | 4328.0x / 213.0x | 🟢 WASM | 1858.3% |
| Analyser (FFT with 2048 fftSize) | 0.15 | 2.82 | 6754.0x / 354.0x | 🟢 WASM | 1780.0% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.16 | 2.27 | 6376.0x / 440.0x | 🟢 WASM | 1318.8% |
| Filter Chain (5 cascaded filters) | 0.16 | 1.41 | 6233.0x / 711.0x | 🟢 WASM | 781.3% |
| Delay Modulation (4 sources with chorus effect) | 0.70 | 5.82 | 1436.0x / 172.0x | 🟢 WASM | 731.4% |
| Stereo Panner (16 sources across stereo field) | 0.88 | 6.99 | 1141.0x / 143.0x | 🟢 WASM | 694.3% |
| Filter Types (8 filter types) | 0.52 | 3.93 | 1922.0x / 254.0x | 🟢 WASM | 655.8% |
| Channel Operations (split/process/merge) | 0.16 | 1.20 | 6133.0x / 832.0x | 🟢 WASM | 650.0% |
| Multichannel (5.1 surround) | 0.56 | 4.02 | 1794.0x / 249.0x | 🟢 WASM | 617.9% |
| WaveShaper (1 second with 2x oversampling) | 0.18 | 1.25 | 5641.0x / 803.0x | 🟢 WASM | 594.4% |
| Gain Ramping (20 crossfades) | 0.26 | 1.14 | 3805.0x / 875.0x | 🟢 WASM | 338.5% |
| Ring Modulation (8 voices) | 1.39 | 6.06 | 721.0x / 165.0x | 🟢 WASM | 336.0% |
| ConstantSource (16 oscillators with LFO modulation) | 2.24 | 9.41 | 446.0x / 106.0x | 🟢 WASM | 320.1% |
| Delay Node (1 second with feedback) | 0.18 | 0.64 | 5710.0x / 1570.0x | 🟢 WASM | 255.6% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.14 | 2.98 | 879.0x / 336.0x | 🟢 WASM | 161.4% |
| Offline Rendering (1 second of audio) | 0.27 | 0.60 | 3674.0x / 1655.0x | 🟢 WASM | 122.2% |
| Oscillators (16 oscillators, 4 waveform types) | 2.22 | 4.80 | 450.0x / 208.0x | 🟢 WASM | 116.2% |
| Envelope Generator (16 notes with ADSR) | 1.20 | 2.22 | 836.0x / 451.0x | 🟢 WASM | 85.0% |
| AudioParam Automation (1000 events) | 0.29 | 0.42 | 0.7x / 1.8x | 🟢 WASM | 44.8% |
| Granular Synthesis (100 grains) | 16.22 | 7.58 | 62.0x / 132.0x | 🔴 Rust | 114.0% |
| Buffer Playback (50 sound effects) | 4.09 | 3.27 | 244.0x / 306.0x | 🔴 Rust | 25.1% |
| Mixing Performance (100 simultaneous sources) | 5.21 | 5.05 | 9.2x / 9.5x | 🔴 Rust | 3.2% |

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
