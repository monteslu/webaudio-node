# Automated Benchmark Results

> **Last Updated:** 2025-10-29
> **Platform:** darwin (arm64)
> **CPU:** Apple M2 Max
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 61
- **Successful Comparisons:** 61 (both implementations completed)
  - **webaudio-node wins:** 53/61 (**86.9%**)
  - **node-web-audio-api wins:** 8/61 (13.1%)
  - **Similar performance (within 1%):** 0/61 (0.0%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 1927.8%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Exponential) | 0.63 | 106.03 | 1575.0x / 9.0x | 🟢 WASM | 16730.2% |
| Panner Distance Models (Inverse) | 0.65 | 105.58 | 1543.0x / 9.0x | 🟢 WASM | 16143.1% |
| Panner Distance Models (Linear) | 0.67 | 104.34 | 1502.0x / 10.0x | 🟢 WASM | 15473.1% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.67 | 103.04 | 1484.0x / 10.0x | 🟢 WASM | 15279.1% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 0.22 | 24.11 | 4484.0x / 41.0x | 🟢 WASM | 10859.1% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 0.24 | 16.78 | 4098.0x / 60.0x | 🟢 WASM | 6891.7% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 0.24 | 13.45 | 4253.0x / 74.0x | 🟢 WASM | 5504.2% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 0.22 | 10.62 | 4469.0x / 94.0x | 🟢 WASM | 4727.3% |
| 3D Panner (8 sources with HRTF positioning) | 4.29 | 104.70 | 233.0x / 10.0x | 🟢 WASM | 2340.6% |
| WaveShaper Oversampling Levels (4x) | 0.37 | 7.46 | 2714.0x / 134.0x | 🟢 WASM | 1916.2% |
| WaveShaper Oversampling Levels (2x) | 0.38 | 4.91 | 2617.0x / 204.0x | 🟢 WASM | 1192.1% |
| WaveShaper Oversampling Levels (none) | 0.40 | 1.77 | 2522.0x / 564.0x | 🟢 WASM | 342.5% |
| Channel Counts Comparison (1 Channel) | 0.15 | 0.62 | 6823.0x / 1613.0x | 🟢 WASM | 313.3% |
| Sample Rates Comparison (22050 Hz) | 0.09 | 0.33 | 11361.0x / 3005.0x | 🟢 WASM | 266.7% |
| Sample Rates Comparison (16000 Hz) | 0.07 | 0.25 | 13911.0x / 3957.0x | 🟢 WASM | 257.1% |
| Sample Rates Comparison (48000 Hz) | 0.20 | 0.64 | 5061.0x / 1556.0x | 🟢 WASM | 220.0% |
| Channel Counts Comparison (2 Channels) | 0.20 | 0.64 | 5042.0x / 1561.0x | 🟢 WASM | 220.0% |
| Sample Rates Comparison (44100 Hz) | 0.19 | 0.60 | 5290.0x / 1679.0x | 🟢 WASM | 215.8% |
| Delay Modulation (4 sources with chorus effect) | 2.29 | 7.07 | 438.0x / 141.0x | 🟢 WASM | 208.7% |
| Filter Modulation (4 oscillators with auto-wah) | 2.10 | 6.25 | 477.0x / 160.0x | 🟢 WASM | 197.6% |
| Ring Modulation (8 voices) | 2.13 | 6.32 | 469.0x / 158.0x | 🟢 WASM | 196.7% |
| Analyser FFT Sizes (8192) | 0.18 | 0.52 | 5509.0x / 1933.0x | 🟢 WASM | 188.9% |
| Analyser FFT Sizes (1024) | 0.17 | 0.49 | 5907.0x / 2046.0x | 🟢 WASM | 188.2% |
| Analyser FFT Sizes (2048) | 0.17 | 0.48 | 5857.0x / 2075.0x | 🟢 WASM | 182.4% |
| Analyser FFT Sizes (512) | 0.17 | 0.47 | 5896.0x / 2125.0x | 🟢 WASM | 176.5% |
| Analyser FFT Sizes (32768) | 0.18 | 0.49 | 5635.0x / 2053.0x | 🟢 WASM | 172.2% |
| Analyser FFT Sizes (16384) | 0.18 | 0.48 | 5602.0x / 2076.0x | 🟢 WASM | 166.7% |
| Sample Rates Comparison (96000 Hz) | 0.47 | 1.24 | 2149.0x / 809.0x | 🟢 WASM | 163.8% |
| Multichannel (5.1 surround) | 1.60 | 4.19 | 625.0x / 239.0x | 🟢 WASM | 161.9% |
| WaveShaper (1 second with 2x oversampling) | 0.53 | 1.26 | 1877.0x / 795.0x | 🟢 WASM | 137.7% |
| ConstantSource (16 oscillators with LFO modulation) | 3.58 | 8.20 | 279.0x / 122.0x | 🟢 WASM | 129.1% |
| Analyser FFT Sizes (256) | 0.22 | 0.48 | 4565.0x / 2077.0x | 🟢 WASM | 118.2% |
| Analyser FFT Sizes (4096) | 0.23 | 0.48 | 4305.0x / 2099.0x | 🟢 WASM | 108.7% |
| Channel Counts Comparison (4 Channels) | 0.38 | 0.68 | 2659.0x / 1473.0x | 🟢 WASM | 78.9% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.74 | 3.01 | 575.0x / 332.0x | 🟢 WASM | 73.0% |
| Oscillators (16 oscillators, 4 waveform types) | 3.38 | 5.72 | 296.0x / 175.0x | 🟢 WASM | 69.2% |
| AudioParam Automation (1000 events) | 0.28 | 0.47 | 0.7x / 2.1x | 🟢 WASM | 67.9% |
| Gain Ramping (20 crossfades) | 0.63 | 1.01 | 1595.0x / 986.0x | 🟢 WASM | 60.3% |
| Stereo Panner (16 sources across stereo field) | 4.41 | 6.79 | 227.0x / 147.0x | 🟢 WASM | 54.0% |
| Analyser (FFT with 2048 fftSize) | 1.60 | 2.33 | 625.0x / 429.0x | 🟢 WASM | 45.6% |
| Channel Operations (split/process/merge) | 0.92 | 1.31 | 1090.0x / 763.0x | 🟢 WASM | 42.4% |
| Heavy Processing (Full mixing/mastering chain) | 13.00 | 17.99 | 77.0x / 56.0x | 🟢 WASM | 38.4% |
| IIR Filter (4 cascaded custom filters) | 2.23 | 3.03 | 448.0x / 330.0x | 🟢 WASM | 35.9% |
| Mixing Performance (100 simultaneous sources) | 4.72 | 6.41 | 10.2x / 7.5x | 🟢 WASM | 35.8% |
| Node Creation (150 nodes per iteration) | 3.26 | 4.40 | 45.9x / 34.1x | 🟢 WASM | 35.0% |
| Sample Rates Comparison (8000 Hz) | 0.12 | 0.16 | 8488.0x / 6116.0x | 🟢 WASM | 33.3% |
| Channel Counts Comparison (6 Channels) | 0.58 | 0.75 | 1719.0x / 1331.0x | 🟢 WASM | 29.3% |
| Envelope Generator (16 notes with ADSR) | 2.13 | 2.49 | 469.0x / 402.0x | 🟢 WASM | 16.9% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.70 | 1.97 | 587.0x / 507.0x | 🟢 WASM | 15.9% |
| Stress Test (100 sources, 400 total nodes) | 55.16 | 63.30 | 18.0x / 16.0x | 🟢 WASM | 14.8% |
| Filter Types (8 filter types) | 4.03 | 4.62 | 248.0x / 217.0x | 🟢 WASM | 14.6% |
| Complex Graph (4 parallel chains) | 1.74 | 1.97 | 287.0x / 253.0x | 🟢 WASM | 13.2% |
| Delay Node (1 second with feedback) | 0.64 | 0.70 | 1552.0x / 1423.0x | 🟢 WASM | 9.4% |
| Convolver (Reverb with 1s impulse response) | 201.54 | 42.46 | 5.0x / 24.0x | 🔴 Rust | 374.7% |
| MP3 Decode | 228.75 | 61.95 | 212.8x / 59.2x | 🔴 Rust | 269.2% |
| Granular Synthesis (100 grains) | 6.36 | 3.16 | 157.0x / 317.0x | 🔴 Rust | 101.3% |
| Audio Processing Chain (filter + compressor + gain) | 1.95 | 1.23 | 512.8x / 813.0x | 🔴 Rust | 58.5% |
| Buffer Playback (50 sound effects) | 4.80 | 3.53 | 208.0x / 283.0x | 🔴 Rust | 36.0% |
| Filter Chain (5 cascaded filters) | 1.74 | 1.58 | 576.0x / 634.0x | 🔴 Rust | 10.1% |
| Channel Counts Comparison (8 Channels) | 0.84 | 0.79 | 1190.0x / 1264.0x | 🔴 Rust | 6.3% |
| Offline Rendering (1 second of audio) | 0.73 | 0.70 | 1363.0x / 1419.0x | 🔴 Rust | 4.3% |

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
