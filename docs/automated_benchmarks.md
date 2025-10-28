# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** darwin (arm64)
> **CPU:** Apple M2 Max
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 60
- **Successful Comparisons:** 60 (both implementations completed)
  - **webaudio-node wins:** 38/60 (**63.3%**)
  - **node-web-audio-api wins:** 21/60 (35.0%)
  - **Similar performance (within 1%):** 1/60 (1.7%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 373.2%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Linear) | 4.51 | 159.41 | 222.0x / 6.0x | 🟢 WASM | 3434.6% |
| AudioListener (8 sources, 50 position/orientation changes) | 4.51 | 106.10 | 222.0x / 9.0x | 🟢 WASM | 2252.5% |
| Panner Distance Models (Exponential) | 4.44 | 104.19 | 225.0x / 10.0x | 🟢 WASM | 2246.6% |
| Panner Distance Models (Inverse) | 4.53 | 104.74 | 221.0x / 10.0x | 🟢 WASM | 2212.1% |
| 3D Panner (8 sources with HRTF positioning) | 4.66 | 104.71 | 215.0x / 10.0x | 🟢 WASM | 2147.0% |
| WaveShaper Oversampling Levels (4x) | 1.96 | 7.66 | 509.0x / 131.0x | 🟢 WASM | 290.8% |
| Filter Modulation (4 oscillators with auto-wah) | 2.23 | 6.30 | 448.0x / 159.0x | 🟢 WASM | 182.5% |
| WaveShaper Oversampling Levels (2x) | 2.01 | 5.31 | 497.0x / 188.0x | 🟢 WASM | 164.2% |
| Delay Modulation (4 sources with chorus effect) | 2.79 | 7.20 | 358.0x / 139.0x | 🟢 WASM | 158.1% |
| Ring Modulation (8 voices) | 2.57 | 6.45 | 389.0x / 155.0x | 🟢 WASM | 151.0% |
| Analyser FFT Sizes (16384) | 0.43 | 0.86 | 2348.0x / 1170.0x | 🟢 WASM | 100.0% |
| ConstantSource (16 oscillators with LFO modulation) | 4.13 | 8.22 | 242.0x / 122.0x | 🟢 WASM | 99.0% |
| WaveShaper (1 second with 2x oversampling) | 0.65 | 1.26 | 1539.0x / 796.0x | 🟢 WASM | 93.8% |
| Filter Types (8 filter types) | 4.34 | 7.09 | 231.0x / 141.0x | 🟢 WASM | 63.4% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.98 | 3.04 | 506.0x / 329.0x | 🟢 WASM | 53.5% |
| Channel Counts Comparison (1 Channel) | 0.46 | 0.66 | 2188.0x / 1516.0x | 🟢 WASM | 43.5% |
| Node Creation (150 nodes per iteration) | 3.18 | 4.50 | 47.1x / 33.4x | 🟢 WASM | 41.5% |
| Oscillators (16 oscillators, 4 waveform types) | 3.92 | 5.52 | 255.0x / 181.0x | 🟢 WASM | 40.8% |
| Delay Node (1 second with feedback) | 0.67 | 0.94 | 1483.0x / 1062.0x | 🟢 WASM | 40.3% |
| Gain Ramping (20 crossfades) | 0.72 | 1.00 | 1384.0x / 996.0x | 🟢 WASM | 38.9% |
| Heavy Processing (Full mixing/mastering chain) | 13.41 | 18.30 | 75.0x / 55.0x | 🟢 WASM | 36.5% |
| Channel Operations (split/process/merge) | 1.06 | 1.37 | 942.0x / 729.0x | 🟢 WASM | 29.2% |
| Analyser (FFT with 2048 fftSize) | 1.73 | 2.23 | 579.0x / 448.0x | 🟢 WASM | 28.9% |
| Sample Rates Comparison (16000 Hz) | 0.21 | 0.27 | 4797.0x / 3653.0x | 🟢 WASM | 28.6% |
| Envelope Generator (16 notes with ADSR) | 1.98 | 2.54 | 506.0x / 394.0x | 🟢 WASM | 28.3% |
| Stereo Panner (16 sources across stereo field) | 5.29 | 6.61 | 189.0x / 151.0x | 🟢 WASM | 25.0% |
| Sample Rates Comparison (22050 Hz) | 0.27 | 0.33 | 3657.0x / 3038.0x | 🟢 WASM | 22.2% |
| Analyser FFT Sizes (2048) | 0.45 | 0.53 | 2221.0x / 1899.0x | 🟢 WASM | 17.8% |
| Analyser FFT Sizes (8192) | 0.43 | 0.50 | 2306.0x / 1983.0x | 🟢 WASM | 16.3% |
| Analyser FFT Sizes (512) | 0.46 | 0.53 | 2172.0x / 1880.0x | 🟢 WASM | 15.2% |
| Analyser FFT Sizes (32768) | 0.43 | 0.49 | 2305.0x / 2025.0x | 🟢 WASM | 14.0% |
| Sample Rates Comparison (8000 Hz) | 0.16 | 0.18 | 6383.0x / 5570.0x | 🟢 WASM | 12.5% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.70 | 1.91 | 587.0x / 524.0x | 🟢 WASM | 12.4% |
| Sample Rates Comparison (48000 Hz) | 0.62 | 0.69 | 1600.0x / 1453.0x | 🟢 WASM | 11.3% |
| Analyser FFT Sizes (1024) | 0.47 | 0.52 | 2134.0x / 1911.0x | 🟢 WASM | 10.6% |
| Channel Counts Comparison (2 Channels) | 0.63 | 0.69 | 1588.0x / 1450.0x | 🟢 WASM | 9.5% |
| Sample Rates Comparison (44100 Hz) | 0.58 | 0.62 | 1725.0x / 1616.0x | 🟢 WASM | 6.9% |
| Analyser FFT Sizes (256) | 0.49 | 0.51 | 2043.0x / 1979.0x | 🟢 WASM | 4.1% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 839.86 | 24.81 | 1.0x / 40.0x | 🔴 Rust | 3285.2% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 394.08 | 17.39 | 3.0x / 57.0x | 🔴 Rust | 2166.1% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 186.25 | 13.78 | 5.0x / 73.0x | 🔴 Rust | 1251.6% |
| Convolver (Reverb with 1s impulse response) | 198.21 | 35.31 | 5.0x / 28.0x | 🔴 Rust | 461.3% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 300.82 | 69.94 | 101.1x / 56.9x | 🔴 Rust | 330.1% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 40.52 | 10.73 | 25.0x / 93.0x | 🔴 Rust | 277.6% |
| Granular Synthesis (100 grains) | 9.24 | 3.50 | 108.0x / 286.0x | 🔴 Rust | 164.0% |
| Channel Counts Comparison (8 Channels) | 2.02 | 0.82 | 495.0x / 1224.0x | 🔴 Rust | 146.3% |
| Multichannel (5.1 surround) | 10.05 | 4.33 | 100.0x / 231.0x | 🔴 Rust | 132.1% |
| Channel Counts Comparison (6 Channels) | 1.58 | 0.76 | 632.0x / 1312.0x | 🔴 Rust | 107.9% |
| Buffer Playback (50 sound effects) | 7.10 | 3.52 | 141.0x / 284.0x | 🔴 Rust | 101.7% |
| Channel Counts Comparison (4 Channels) | 1.19 | 0.70 | 843.0x / 1430.0x | 🔴 Rust | 70.0% |
| AudioParam Automation (1000 events) | 0.62 | 0.47 | 0.7x / 2.4x | 🔴 Rust | 31.9% |
| Mixing Performance (100 simultaneous sources) | 8.05 | 6.32 | 6.0x / 7.6x | 🔴 Rust | 27.4% |
| IIR Filter (4 cascaded custom filters) | 3.32 | 2.89 | 301.0x / 346.0x | 🔴 Rust | 14.9% |
| Filter Chain (5 cascaded filters) | 1.84 | 1.61 | 544.0x / 621.0x | 🔴 Rust | 14.3% |
| Complex Graph (4 parallel chains) | 2.07 | 1.91 | 241.0x / 262.0x | 🔴 Rust | 8.4% |
| Stress Test (100 sources, 400 total nodes) | 70.54 | 66.03 | 14.0x / 15.0x | 🔴 Rust | 6.8% |
| Analyser FFT Sizes (4096) | 0.54 | 0.51 | 1843.0x / 1946.0x | 🔴 Rust | 5.9% |
| WaveShaper Oversampling Levels (none) | 1.96 | 1.86 | 510.0x / 536.0x | 🔴 Rust | 5.4% |
| Sample Rates Comparison (96000 Hz) | 1.33 | 1.31 | 755.0x / 764.0x | 🔴 Rust | 1.5% |
| Offline Rendering (1 second of audio) | 0.71 | 0.71 | 1403.0x / 1417.0x | 🟡 Similar | 0.0% |

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
