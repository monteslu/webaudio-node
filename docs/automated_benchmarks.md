# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 61
- **Successful Comparisons:** 47 (both implementations completed)
  - **webaudio-node wins:** 38/47 (**80.9%**)
  - **node-web-audio-api wins:** 9/47 (19.1%)
  - **Similar performance (within 1%):** 0/47 (0.0%)
- **Failed Benchmarks:** 14
  - **webaudio-node failed:** 14
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 350.0%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Sample Rates Comparison (8000 Hz) | 0.08 | 2.90 | 11933.0x / 345.0x | 🟢 WASM | 3525.0% |
| Panner Distance Models (Inverse) | 2.70 | 35.72 | 370.0x / 28.0x | 🟢 WASM | 1223.0% |
| Panner Distance Models (Exponential) | 2.77 | 36.27 | 361.0x / 28.0x | 🟢 WASM | 1209.4% |
| AudioListener (8 sources, 50 position/orientation changes) | 3.24 | 36.91 | 309.0x / 27.0x | 🟢 WASM | 1039.2% |
| Panner Distance Models (Linear) | 3.21 | 35.95 | 312.0x / 28.0x | 🟢 WASM | 1019.9% |
| 3D Panner (8 sources with HRTF positioning) | 3.47 | 38.31 | 288.0x / 26.0x | 🟢 WASM | 1004.0% |
| Delay Modulation (4 sources with chorus effect) | 0.72 | 5.98 | 1387.0x / 167.0x | 🟢 WASM | 730.6% |
| Filter Modulation (4 oscillators with auto-wah) | 1.35 | 7.75 | 742.0x / 129.0x | 🟢 WASM | 474.1% |
| Complex Graph (4 parallel chains) | 0.36 | 1.85 | 1390.0x / 270.0x | 🟢 WASM | 413.9% |
| Gain Ramping (20 crossfades) | 0.27 | 1.38 | 3667.0x / 724.0x | 🟢 WASM | 411.1% |
| Ring Modulation (8 voices) | 1.43 | 5.71 | 697.0x / 175.0x | 🟢 WASM | 299.3% |
| Analyser (FFT with 2048 fftSize) | 0.66 | 2.45 | 1507.0x / 408.0x | 🟢 WASM | 271.2% |
| ConstantSource (16 oscillators with LFO modulation) | 2.35 | 7.96 | 426.0x / 126.0x | 🟢 WASM | 238.7% |
| Analyser FFT Sizes (4096) | 0.39 | 0.98 | 2541.0x / 1017.0x | 🟢 WASM | 151.3% |
| Oscillators (16 oscillators, 4 waveform types) | 2.20 | 5.15 | 455.0x / 194.0x | 🟢 WASM | 134.1% |
| WaveShaper (1 second with 2x oversampling) | 0.50 | 1.13 | 2014.0x / 886.0x | 🟢 WASM | 126.0% |
| Sample Rates Comparison (22050 Hz) | 0.22 | 0.48 | 4463.0x / 2090.0x | 🟢 WASM | 118.2% |
| Envelope Generator (16 notes with ADSR) | 1.15 | 2.23 | 868.0x / 448.0x | 🟢 WASM | 93.9% |
| Channel Operations (split/process/merge) | 0.63 | 1.21 | 1599.0x / 828.0x | 🟢 WASM | 92.1% |
| AudioParam Automation (1000 events) | 0.22 | 0.40 | 0.5x / 2.0x | 🟢 WASM | 81.8% |
| Stereo Panner (16 sources across stereo field) | 3.16 | 5.54 | 317.0x / 180.0x | 🟢 WASM | 75.3% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.43 | 2.31 | 697.0x / 432.0x | 🟢 WASM | 61.5% |
| Channel Counts Comparison (1 Channel) | 0.35 | 0.56 | 2882.0x / 1773.0x | 🟢 WASM | 60.0% |
| Delay Node (1 second with feedback) | 0.46 | 0.70 | 2151.0x / 1437.0x | 🟢 WASM | 52.2% |
| Filter Types (8 filter types) | 2.64 | 3.98 | 379.0x / 251.0x | 🟢 WASM | 50.8% |
| Sample Rates Comparison (16000 Hz) | 0.32 | 0.46 | 3093.0x / 2152.0x | 🟢 WASM | 43.8% |
| Channel Counts Comparison (2 Channels) | 0.43 | 0.60 | 2336.0x / 1679.0x | 🟢 WASM | 39.5% |
| Sample Rates Comparison (44100 Hz) | 0.40 | 0.55 | 2519.0x / 1826.0x | 🟢 WASM | 37.5% |
| Sample Rates Comparison (48000 Hz) | 0.43 | 0.58 | 2347.0x / 1734.0x | 🟢 WASM | 34.9% |
| Filter Chain (5 cascaded filters) | 1.13 | 1.48 | 887.0x / 677.0x | 🟢 WASM | 31.0% |
| Stress Test (100 sources, 400 total nodes) | 43.09 | 56.21 | 23.0x / 18.0x | 🟢 WASM | 30.4% |
| Sample Rates Comparison (96000 Hz) | 0.91 | 1.17 | 1105.0x / 855.0x | 🟢 WASM | 28.6% |
| Analyser FFT Sizes (8192) | 0.39 | 0.48 | 2538.0x / 2105.0x | 🟢 WASM | 23.1% |
| Offline Rendering (1 second of audio) | 0.71 | 0.87 | 1408.0x / 1143.0x | 🟢 WASM | 22.5% |
| Analyser FFT Sizes (1024) | 0.39 | 0.45 | 2545.0x / 2216.0x | 🟢 WASM | 15.4% |
| Analyser FFT Sizes (2048) | 0.39 | 0.45 | 2544.0x / 2236.0x | 🟢 WASM | 15.4% |
| Analyser FFT Sizes (16384) | 0.39 | 0.44 | 2552.0x / 2252.0x | 🟢 WASM | 12.8% |
| Analyser FFT Sizes (512) | 0.40 | 0.44 | 2524.0x / 2252.0x | 🟢 WASM | 10.0% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 385.20 | 92.42 | 83.4x / 69.6x | 🔴 Rust | 316.8% |
| Channel Counts Comparison (8 Channels) | 1.91 | 0.79 | 522.0x / 1260.0x | 🔴 Rust | 141.8% |
| Channel Counts Comparison (6 Channels) | 1.47 | 0.74 | 680.0x / 1346.0x | 🔴 Rust | 98.6% |
| Multichannel (5.1 surround) | 6.26 | 3.91 | 160.0x / 255.0x | 🔴 Rust | 60.1% |
| Node Creation (150 nodes per iteration) | 7.04 | 5.97 | 21.3x / 25.1x | 🔴 Rust | 17.9% |
| Channel Counts Comparison (4 Channels) | 0.80 | 0.69 | 1256.0x / 1459.0x | 🔴 Rust | 15.9% |
| Analyser FFT Sizes (256) | 0.53 | 0.46 | 1888.0x / 2166.0x | 🔴 Rust | 15.2% |
| Mixing Performance (100 simultaneous sources) | 5.31 | 4.88 | 9.0x / 9.8x | 🔴 Rust | 8.8% |
| Analyser FFT Sizes (32768) | 0.47 | 0.45 | 2125.0x / 2222.0x | 🔴 Rust | 4.4% |
| Convolver (Reverb with 1s impulse response) | FAILED | 19.79 | N/A / 51.0x | ❌ webaudio-node FAILED | N/A |
| Buffer Playback (50 sound effects) | FAILED | 3.00 | N/A / 333.0x | ❌ webaudio-node FAILED | N/A |
| IIR Filter (4 cascaded custom filters) | FAILED | 5.01 | N/A / 200.0x | ❌ webaudio-node FAILED | N/A |
| Heavy Processing (Full mixing/mastering chain) | FAILED | 15.96 | N/A / 63.0x | ❌ webaudio-node FAILED | N/A |
| PeriodicWave (8 custom waveforms, 32 harmonics) | FAILED | 3.73 | N/A / 268.0x | ❌ webaudio-node FAILED | N/A |
| Granular Synthesis (100 grains) | FAILED | 3.27 | N/A / 306.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (none) | FAILED | 1.83 | N/A / 547.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (2x) | FAILED | 3.90 | N/A / 257.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (4x) | FAILED | 5.99 | N/A / 167.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | FAILED | 6.69 | N/A / 149.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | FAILED | 9.49 | N/A / 105.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (1s (48000 samples)) | FAILED | 13.44 | N/A / 74.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (2s (96000 samples)) | FAILED | 20.65 | N/A / 48.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (4s (192000 samples)) | FAILED | 50.52 | N/A / 20.0x | ❌ webaudio-node FAILED | N/A |

## Interpretation

- **Render Time (ms):** Time taken to render 1 second of audio. Lower is better.
- **Realtime Multiplier:** How many times faster than realtime the rendering is. Higher is better.
  - Example: 100x means it can render 100 seconds of audio in 1 second
- **🟢 WASM:** webaudio-node is faster for this benchmark
- **🔴 Rust:** node-web-audio-api is faster for this benchmark
- **🟡 Similar:** Performance difference is within 1% (essentially equivalent)
- **❌ FAILED:** One implementation failed to complete the benchmark

## Notes

These benchmarks measure offline rendering performance, which is different from realtime audio playback. Results may vary based on:
- Hardware (CPU, memory)
- Operating system
- Node.js version
- System load during testing

Both implementations are capable of realtime audio processing as indicated by realtime multipliers significantly greater than 1.0x.
