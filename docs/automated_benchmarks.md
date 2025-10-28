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
  - **webaudio-node wins:** 32/60 (**53.3%**)
  - **node-web-audio-api wins:** 27/60 (45.0%)
  - **Similar performance (within 1%):** 1/60 (1.7%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 405.1%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Inverse) | 4.53 | 106.51 | 221.0x / 9.0x | 🟢 WASM | 2251.2% |
| AudioListener (8 sources, 50 position/orientation changes) | 4.50 | 104.60 | 222.0x / 10.0x | 🟢 WASM | 2224.4% |
| 3D Panner (8 sources with HRTF positioning) | 4.51 | 104.68 | 222.0x / 10.0x | 🟢 WASM | 2221.1% |
| Panner Distance Models (Linear) | 4.55 | 105.59 | 220.0x / 9.0x | 🟢 WASM | 2220.7% |
| Panner Distance Models (Exponential) | 4.47 | 103.18 | 224.0x / 10.0x | 🟢 WASM | 2208.3% |
| WaveShaper Oversampling Levels (4x) | 1.98 | 7.61 | 505.0x / 131.0x | 🟢 WASM | 284.3% |
| Filter Modulation (4 oscillators with auto-wah) | 2.20 | 6.27 | 454.0x / 159.0x | 🟢 WASM | 185.0% |
| WaveShaper Oversampling Levels (2x) | 2.00 | 5.21 | 501.0x / 192.0x | 🟢 WASM | 160.5% |
| Delay Modulation (4 sources with chorus effect) | 2.70 | 7.02 | 371.0x / 142.0x | 🟢 WASM | 160.0% |
| Ring Modulation (8 voices) | 2.55 | 6.36 | 392.0x / 157.0x | 🟢 WASM | 149.4% |
| WaveShaper (1 second with 2x oversampling) | 0.61 | 1.28 | 1633.0x / 784.0x | 🟢 WASM | 109.8% |
| ConstantSource (16 oscillators with LFO modulation) | 3.96 | 8.21 | 252.0x / 122.0x | 🟢 WASM | 107.3% |
| Analyser FFT Sizes (16384) | 0.54 | 1.01 | 1849.0x / 988.0x | 🟢 WASM | 87.0% |
| AudioParam Automation (1000 events) | 0.25 | 0.45 | 0.8x / 2.3x | 🟢 WASM | 80.0% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.93 | 2.96 | 519.0x / 338.0x | 🟢 WASM | 53.4% |
| Oscillators (16 oscillators, 4 waveform types) | 3.84 | 5.77 | 260.0x / 173.0x | 🟢 WASM | 50.3% |
| Channel Operations (split/process/merge) | 1.01 | 1.47 | 991.0x / 679.0x | 🟢 WASM | 45.5% |
| Gain Ramping (20 crossfades) | 0.70 | 1.01 | 1437.0x / 994.0x | 🟢 WASM | 44.3% |
| Node Creation (150 nodes per iteration) | 3.07 | 4.38 | 48.9x / 34.2x | 🟢 WASM | 42.7% |
| Heavy Processing (Full mixing/mastering chain) | 12.92 | 18.09 | 77.0x / 55.0x | 🟢 WASM | 40.0% |
| Delay Node (1 second with feedback) | 0.65 | 0.91 | 1529.0x / 1094.0x | 🟢 WASM | 40.0% |
| Channel Counts Comparison (1 Channel) | 0.46 | 0.64 | 2172.0x / 1556.0x | 🟢 WASM | 39.1% |
| Analyser (FFT with 2048 fftSize) | 1.73 | 2.35 | 578.0x / 425.0x | 🟢 WASM | 35.8% |
| Envelope Generator (16 notes with ADSR) | 1.91 | 2.48 | 522.0x / 403.0x | 🟢 WASM | 29.8% |
| Stereo Panner (16 sources across stereo field) | 5.18 | 6.64 | 193.0x / 151.0x | 🟢 WASM | 28.2% |
| Sample Rates Comparison (16000 Hz) | 0.21 | 0.26 | 4757.0x / 3833.0x | 🟢 WASM | 23.8% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.70 | 1.92 | 590.0x / 520.0x | 🟢 WASM | 12.9% |
| Filter Types (8 filter types) | 4.24 | 4.65 | 236.0x / 215.0x | 🟢 WASM | 9.7% |
| Sample Rates Comparison (8000 Hz) | 0.15 | 0.16 | 6459.0x / 6233.0x | 🟢 WASM | 6.7% |
| Sample Rates Comparison (22050 Hz) | 0.30 | 0.32 | 3287.0x / 3163.0x | 🟢 WASM | 6.7% |
| Channel Counts Comparison (2 Channels) | 0.62 | 0.65 | 1624.0x / 1544.0x | 🟢 WASM | 4.8% |
| Sample Rates Comparison (48000 Hz) | 0.62 | 0.63 | 1612.0x / 1590.0x | 🟢 WASM | 1.6% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 839.19 | 24.23 | 1.0x / 41.0x | 🔴 Rust | 3363.4% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 395.58 | 17.13 | 3.0x / 58.0x | 🔴 Rust | 2209.3% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 186.17 | 13.79 | 5.0x / 73.0x | 🔴 Rust | 1250.0% |
| Convolver (Reverb with 1s impulse response) | 197.64 | 31.43 | 5.0x / 32.0x | 🔴 Rust | 528.8% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 40.30 | 10.56 | 25.0x / 95.0x | 🔴 Rust | 281.6% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 302.09 | 95.17 | 96.4x / 59.5x | 🔴 Rust | 217.4% |
| Granular Synthesis (100 grains) | 9.15 | 3.22 | 109.0x / 311.0x | 🔴 Rust | 184.2% |
| Channel Counts Comparison (8 Channels) | 2.06 | 0.78 | 486.0x / 1285.0x | 🔴 Rust | 164.1% |
| Multichannel (5.1 surround) | 10.04 | 4.21 | 100.0x / 238.0x | 🔴 Rust | 138.5% |
| Channel Counts Comparison (6 Channels) | 1.65 | 0.73 | 606.0x / 1365.0x | 🔴 Rust | 126.0% |
| Buffer Playback (50 sound effects) | 6.99 | 3.57 | 143.0x / 280.0x | 🔴 Rust | 95.8% |
| Channel Counts Comparison (4 Channels) | 1.19 | 0.71 | 843.0x / 1410.0x | 🔴 Rust | 67.6% |
| Mixing Performance (100 simultaneous sources) | 8.66 | 6.21 | 5.5x / 7.7x | 🔴 Rust | 39.5% |
| Offline Rendering (1 second of audio) | 0.89 | 0.68 | 1127.0x / 1471.0x | 🔴 Rust | 30.9% |
| Analyser FFT Sizes (4096) | 0.61 | 0.50 | 1650.0x / 1990.0x | 🔴 Rust | 22.0% |
| Filter Chain (5 cascaded filters) | 1.81 | 1.58 | 551.0x / 633.0x | 🔴 Rust | 14.6% |
| WaveShaper Oversampling Levels (none) | 1.99 | 1.80 | 502.0x / 556.0x | 🔴 Rust | 10.6% |
| IIR Filter (4 cascaded custom filters) | 3.21 | 2.94 | 312.0x / 340.0x | 🔴 Rust | 9.2% |
| Sample Rates Comparison (96000 Hz) | 1.33 | 1.22 | 753.0x / 821.0x | 🔴 Rust | 9.0% |
| Analyser FFT Sizes (512) | 0.52 | 0.48 | 1923.0x / 2083.0x | 🔴 Rust | 8.3% |
| Analyser FFT Sizes (2048) | 0.52 | 0.48 | 1932.0x / 2072.0x | 🔴 Rust | 8.3% |
| Analyser FFT Sizes (1024) | 0.53 | 0.50 | 1899.0x / 2018.0x | 🔴 Rust | 6.0% |
| Analyser FFT Sizes (32768) | 0.53 | 0.50 | 1879.0x / 2003.0x | 🔴 Rust | 6.0% |
| Analyser FFT Sizes (256) | 0.55 | 0.52 | 1812.0x / 1941.0x | 🔴 Rust | 5.8% |
| Stress Test (100 sources, 400 total nodes) | 66.91 | 63.75 | 15.0x / 16.0x | 🔴 Rust | 5.0% |
| Analyser FFT Sizes (8192) | 0.51 | 0.50 | 1951.0x / 2014.0x | 🔴 Rust | 2.0% |
| Sample Rates Comparison (44100 Hz) | 0.58 | 0.57 | 1715.0x / 1753.0x | 🔴 Rust | 1.8% |
| Complex Graph (4 parallel chains) | 2.02 | 2.03 | 247.0x / 246.0x | 🟡 Similar | 0.5% |

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
