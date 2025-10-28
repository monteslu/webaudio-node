# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 61
- **Successful Comparisons:** 46 (both implementations completed)
  - **webaudio-node wins:** 42/46 (**91.3%**)
  - **node-web-audio-api wins:** 4/46 (8.7%)
  - **Similar performance (within 1%):** 0/46 (0.0%)
- **Failed Benchmarks:** 15
  - **webaudio-node failed:** 15
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 259.8%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| 3D Panner (8 sources with HRTF positioning) | 2.82 | 38.97 | 355.0x / 26.0x | 🟢 WASM | 1281.9% |
| Panner Distance Models (Exponential) | 2.72 | 36.66 | 367.0x / 27.0x | 🟢 WASM | 1247.8% |
| Panner Distance Models (Linear) | 2.74 | 36.38 | 366.0x / 27.0x | 🟢 WASM | 1227.7% |
| Panner Distance Models (Inverse) | 2.74 | 35.99 | 365.0x / 28.0x | 🟢 WASM | 1213.5% |
| AudioListener (8 sources, 50 position/orientation changes) | 2.92 | 36.45 | 343.0x / 27.0x | 🟢 WASM | 1148.3% |
| Delay Modulation (4 sources with chorus effect) | 0.77 | 6.33 | 1295.0x / 158.0x | 🟢 WASM | 722.1% |
| Analyser (FFT with 2048 fftSize) | 0.43 | 2.66 | 2339.0x / 377.0x | 🟢 WASM | 518.6% |
| Filter Modulation (4 oscillators with auto-wah) | 1.35 | 7.94 | 741.0x / 126.0x | 🟢 WASM | 488.1% |
| Gain Ramping (20 crossfades) | 0.26 | 1.22 | 3838.0x / 818.0x | 🟢 WASM | 369.2% |
| Complex Graph (4 parallel chains) | 0.40 | 1.81 | 1249.0x / 277.0x | 🟢 WASM | 352.5% |
| Ring Modulation (8 voices) | 1.41 | 5.68 | 707.0x / 176.0x | 🟢 WASM | 302.8% |
| ConstantSource (16 oscillators with LFO modulation) | 2.30 | 8.46 | 435.0x / 118.0x | 🟢 WASM | 267.8% |
| Sample Rates Comparison (8000 Hz) | 0.08 | 0.24 | 11947.0x / 4217.0x | 🟢 WASM | 200.0% |
| AudioParam Automation (1000 events) | 0.22 | 0.57 | 1.6x / 2.7x | 🟢 WASM | 159.1% |
| Channel Counts Comparison (1 Channel) | 0.27 | 0.63 | 3646.0x / 1584.0x | 🟢 WASM | 133.3% |
| Oscillators (16 oscillators, 4 waveform types) | 2.27 | 5.07 | 440.0x / 197.0x | 🟢 WASM | 123.3% |
| Delay Node (1 second with feedback) | 0.52 | 1.13 | 1909.0x / 887.0x | 🟢 WASM | 117.3% |
| Envelope Generator (16 notes with ADSR) | 1.16 | 2.50 | 864.0x / 400.0x | 🟢 WASM | 115.5% |
| WaveShaper (1 second with 2x oversampling) | 0.62 | 1.30 | 1623.0x / 767.0x | 🟢 WASM | 109.7% |
| Stereo Panner (16 sources across stereo field) | 3.21 | 5.70 | 311.0x / 176.0x | 🟢 WASM | 77.6% |
| Channel Operations (split/process/merge) | 0.75 | 1.28 | 1330.0x / 780.0x | 🟢 WASM | 70.7% |
| Offline Rendering (1 second of audio) | 0.55 | 0.93 | 1829.0x / 1074.0x | 🟢 WASM | 69.1% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.52 | 2.41 | 657.0x / 414.0x | 🟢 WASM | 58.6% |
| Filter Types (8 filter types) | 2.70 | 3.99 | 371.0x / 250.0x | 🟢 WASM | 47.8% |
| Analyser FFT Sizes (4096) | 0.42 | 0.59 | 2382.0x / 1694.0x | 🟢 WASM | 40.5% |
| Sample Rates Comparison (22050 Hz) | 0.20 | 0.28 | 4889.0x / 3510.0x | 🟢 WASM | 40.0% |
| Sample Rates Comparison (16000 Hz) | 0.16 | 0.22 | 6304.0x / 4631.0x | 🟢 WASM | 37.5% |
| Channel Counts Comparison (2 Channels) | 0.43 | 0.59 | 2344.0x / 1693.0x | 🟢 WASM | 37.2% |
| Analyser FFT Sizes (16384) | 0.39 | 0.53 | 2556.0x / 1877.0x | 🟢 WASM | 35.9% |
| Stress Test (100 sources, 400 total nodes) | 42.02 | 56.72 | 24.0x / 18.0x | 🟢 WASM | 35.0% |
| Sample Rates Comparison (48000 Hz) | 0.42 | 0.56 | 2382.0x / 1771.0x | 🟢 WASM | 33.3% |
| Sample Rates Comparison (44100 Hz) | 0.39 | 0.52 | 2570.0x / 1909.0x | 🟢 WASM | 33.3% |
| Analyser FFT Sizes (2048) | 0.38 | 0.49 | 2606.0x / 2048.0x | 🟢 WASM | 28.9% |
| Analyser FFT Sizes (1024) | 0.38 | 0.48 | 2616.0x / 2089.0x | 🟢 WASM | 26.3% |
| Analyser FFT Sizes (512) | 0.39 | 0.48 | 2569.0x / 2083.0x | 🟢 WASM | 23.1% |
| Analyser FFT Sizes (256) | 0.38 | 0.46 | 2629.0x / 2189.0x | 🟢 WASM | 21.1% |
| Analyser FFT Sizes (32768) | 0.38 | 0.46 | 2633.0x / 2178.0x | 🟢 WASM | 21.1% |
| Analyser FFT Sizes (8192) | 0.39 | 0.47 | 2557.0x / 2134.0x | 🟢 WASM | 20.5% |
| Mixing Performance (100 simultaneous sources) | 4.75 | 5.67 | 10.1x / 8.5x | 🟢 WASM | 19.4% |
| Filter Chain (5 cascaded filters) | 1.22 | 1.43 | 819.0x / 700.0x | 🟢 WASM | 17.2% |
| Sample Rates Comparison (96000 Hz) | 0.97 | 1.12 | 1026.0x / 890.0x | 🟢 WASM | 15.5% |
| Multichannel (5.1 surround) | 6.41 | 6.56 | 156.0x / 152.0x | 🟢 WASM | 2.3% |
| Channel Counts Comparison (8 Channels) | 1.48 | 0.79 | 674.0x / 1270.0x | 🔴 Rust | 87.3% |
| Channel Counts Comparison (6 Channels) | 1.07 | 0.74 | 932.0x / 1355.0x | 🔴 Rust | 44.6% |
| Channel Counts Comparison (4 Channels) | 0.77 | 0.67 | 1304.0x / 1485.0x | 🔴 Rust | 14.9% |
| Node Creation (150 nodes per iteration) | 6.56 | 5.97 | 22.9x / 25.1x | 🔴 Rust | 9.9% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | FAILED | 85.58 | N/A / 68.6x | ❌ webaudio-node FAILED | N/A |
| Convolver (Reverb with 1s impulse response) | FAILED | 80.87 | N/A / 12.0x | ❌ webaudio-node FAILED | N/A |
| Buffer Playback (50 sound effects) | FAILED | 4.20 | N/A / 238.0x | ❌ webaudio-node FAILED | N/A |
| IIR Filter (4 cascaded custom filters) | FAILED | 3.86 | N/A / 259.0x | ❌ webaudio-node FAILED | N/A |
| Heavy Processing (Full mixing/mastering chain) | FAILED | 17.20 | N/A / 58.0x | ❌ webaudio-node FAILED | N/A |
| PeriodicWave (8 custom waveforms, 32 harmonics) | FAILED | 3.67 | N/A / 272.0x | ❌ webaudio-node FAILED | N/A |
| Granular Synthesis (100 grains) | FAILED | 3.83 | N/A / 261.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (none) | FAILED | 1.83 | N/A / 545.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (2x) | FAILED | 3.92 | N/A / 255.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (4x) | FAILED | 5.91 | N/A / 169.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | FAILED | 6.74 | N/A / 148.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | FAILED | 10.58 | N/A / 94.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (1s (48000 samples)) | FAILED | 13.42 | N/A / 75.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (2s (96000 samples)) | FAILED | 32.56 | N/A / 31.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (4s (192000 samples)) | FAILED | 51.69 | N/A / 19.0x | ❌ webaudio-node FAILED | N/A |

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
