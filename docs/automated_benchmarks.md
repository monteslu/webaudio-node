# Automated Benchmark Results

> **Last Updated:** 2025-10-27
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 30
- **webaudio-node Wins:** 27 (90.0%)
- **node-web-audio-api Wins:** 3 (10.0%)
- **Similar Performance (within 1%):** 0 (0.0%)
- **Average Speedup (when faster):** 2230.6%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| 3D Panner (8 sources with HRTF positioning) | 0.41 | 38.11 | 2431.0x / 26.0x | 🟢 WASM | 9195.1% |
| Heavy Processing (Full mixing/mastering chain) | 0.19 | 16.58 | 5136.0x / 60.0x | 🟢 WASM | 8626.3% |
| Node Creation (150 nodes per iteration) | 0.07 | 6.05 | 2234.8x / 24.8x | 🟢 WASM | 8542.9% |
| Convolver (Reverb with 1s impulse response) | 0.32 | 27.33 | 3154.0x / 37.0x | 🟢 WASM | 8440.6% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.44 | 35.70 | 2292.0x / 28.0x | 🟢 WASM | 8013.6% |
| Stress Test (100 sources, 400 total nodes) | 1.70 | 58.16 | 588.0x / 17.0x | 🟢 WASM | 3321.2% |
| Filter Modulation (4 oscillators with auto-wah) | 0.30 | 7.60 | 3318.0x / 132.0x | 🟢 WASM | 2433.3% |
| Complex Graph (4 parallel chains) | 0.10 | 1.78 | 4964.0x / 281.0x | 🟢 WASM | 1680.0% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.14 | 2.38 | 6964.0x / 420.0x | 🟢 WASM | 1600.0% |
| Analyser (FFT with 2048 fftSize) | 0.15 | 2.42 | 6507.0x / 412.0x | 🟢 WASM | 1513.3% |
| Multichannel (5.1 surround) | 0.68 | 6.46 | 1471.0x / 155.0x | 🟢 WASM | 850.0% |
| Filter Chain (5 cascaded filters) | 0.16 | 1.38 | 6360.0x / 722.0x | 🟢 WASM | 762.5% |
| Filter Types (8 filter types) | 0.51 | 4.16 | 1959.0x / 240.0x | 🟢 WASM | 715.7% |
| WaveShaper (1 second with 2x oversampling) | 0.16 | 1.22 | 6143.0x / 819.0x | 🟢 WASM | 662.5% |
| Channel Operations (split/process/merge) | 0.16 | 1.18 | 6377.0x / 848.0x | 🟢 WASM | 637.5% |
| Delay Modulation (4 sources with chorus effect) | 0.88 | 6.14 | 1140.0x / 163.0x | 🟢 WASM | 597.7% |
| Stereo Panner (16 sources across stereo field) | 0.81 | 5.30 | 1238.0x / 189.0x | 🟢 WASM | 554.3% |
| Gain Ramping (20 crossfades) | 0.26 | 1.16 | 3798.0x / 859.0x | 🟢 WASM | 346.2% |
| Ring Modulation (8 voices) | 1.40 | 6.12 | 712.0x / 163.0x | 🟢 WASM | 337.1% |
| Delay Node (1 second with feedback) | 0.16 | 0.68 | 6137.0x / 1475.0x | 🟢 WASM | 325.0% |
| Offline Rendering (1 second of audio) | 0.25 | 1.02 | 3960.0x / 976.0x | 🟢 WASM | 308.0% |
| ConstantSource (16 oscillators with LFO modulation) | 2.26 | 7.56 | 443.0x / 132.0x | 🟢 WASM | 234.5% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.17 | 2.99 | 856.0x / 334.0x | 🟢 WASM | 155.6% |
| Envelope Generator (16 notes with ADSR) | 1.14 | 2.67 | 879.0x / 375.0x | 🟢 WASM | 134.2% |
| Oscillators (16 oscillators, 4 waveform types) | 2.14 | 4.95 | 468.0x / 202.0x | 🟢 WASM | 131.3% |
| AudioParam Automation (1000 events) | 0.32 | 0.50 | 0.8x / 2.0x | 🟢 WASM | 56.3% |
| Mixing Performance (100 simultaneous sources) | 4.84 | 7.33 | 9.9x / 6.5x | 🟢 WASM | 51.4% |
| Memory Usage (100 sources, shared buffer) | 13859248.00 | 4.08 | 138592.5x / 41.7x | 🔴 Rust | 339687351.0% |
| Granular Synthesis (100 grains) | 17.79 | 5.81 | 56.0x / 172.0x | 🔴 Rust | 206.2% |
| Buffer Playback (50 sound effects) | 4.14 | 3.52 | 242.0x / 284.0x | 🔴 Rust | 17.6% |

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
