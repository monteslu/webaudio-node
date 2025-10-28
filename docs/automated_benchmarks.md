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
  - **webaudio-node wins:** 34/60 (**56.7%**)
  - **node-web-audio-api wins:** 26/60 (43.3%)
  - **Similar performance (within 1%):** 0/60 (0.0%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 372.4%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Exponential) | 4.67 | 108.49 | 214.0x / 9.0x | 🟢 WASM | 2223.1% |
| AudioListener (8 sources, 50 position/orientation changes) | 4.62 | 106.76 | 217.0x / 9.0x | 🟢 WASM | 2210.8% |
| Panner Distance Models (Linear) | 4.71 | 105.95 | 212.0x / 9.0x | 🟢 WASM | 2149.5% |
| Panner Distance Models (Inverse) | 4.71 | 105.26 | 212.0x / 10.0x | 🟢 WASM | 2134.8% |
| 3D Panner (8 sources with HRTF positioning) | 4.78 | 106.61 | 209.0x / 9.0x | 🟢 WASM | 2130.3% |
| WaveShaper Oversampling Levels (4x) | 2.05 | 7.75 | 489.0x / 129.0x | 🟢 WASM | 278.0% |
| Delay Modulation (4 sources with chorus effect) | 2.69 | 7.58 | 372.0x / 132.0x | 🟢 WASM | 181.8% |
| Filter Modulation (4 oscillators with auto-wah) | 2.29 | 6.45 | 437.0x / 155.0x | 🟢 WASM | 181.7% |
| Ring Modulation (8 voices) | 2.62 | 6.43 | 382.0x / 155.0x | 🟢 WASM | 145.4% |
| WaveShaper Oversampling Levels (2x) | 2.10 | 5.04 | 476.0x / 198.0x | 🟢 WASM | 140.0% |
| ConstantSource (16 oscillators with LFO modulation) | 4.17 | 8.93 | 240.0x / 112.0x | 🟢 WASM | 114.1% |
| WaveShaper (1 second with 2x oversampling) | 0.59 | 1.26 | 1687.0x / 795.0x | 🟢 WASM | 113.6% |
| AudioParam Automation (1000 events) | 0.25 | 0.50 | 0.8x / 2.1x | 🟢 WASM | 100.0% |
| Analyser FFT Sizes (16384) | 0.54 | 0.86 | 1838.0x / 1157.0x | 🟢 WASM | 59.3% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.98 | 3.04 | 504.0x / 329.0x | 🟢 WASM | 53.5% |
| Gain Ramping (20 crossfades) | 0.72 | 1.05 | 1386.0x / 955.0x | 🟢 WASM | 45.8% |
| Channel Counts Comparison (1 Channel) | 0.46 | 0.66 | 2159.0x / 1521.0x | 🟢 WASM | 43.5% |
| Node Creation (150 nodes per iteration) | 3.16 | 4.51 | 47.5x / 33.3x | 🟢 WASM | 42.7% |
| Heavy Processing (Full mixing/mastering chain) | 13.34 | 18.70 | 75.0x / 53.0x | 🟢 WASM | 40.2% |
| Oscillators (16 oscillators, 4 waveform types) | 4.05 | 5.59 | 247.0x / 179.0x | 🟢 WASM | 38.0% |
| Envelope Generator (16 notes with ADSR) | 2.02 | 2.62 | 495.0x / 382.0x | 🟢 WASM | 29.7% |
| Channel Operations (split/process/merge) | 1.03 | 1.33 | 973.0x / 749.0x | 🟢 WASM | 29.1% |
| Stereo Panner (16 sources across stereo field) | 5.38 | 6.82 | 186.0x / 147.0x | 🟢 WASM | 26.8% |
| Sample Rates Comparison (22050 Hz) | 0.28 | 0.35 | 3559.0x / 2834.0x | 🟢 WASM | 25.0% |
| Analyser (FFT with 2048 fftSize) | 1.84 | 2.29 | 544.0x / 438.0x | 🟢 WASM | 24.5% |
| Sample Rates Comparison (16000 Hz) | 0.21 | 0.26 | 4860.0x / 3849.0x | 🟢 WASM | 23.8% |
| Delay Node (1 second with feedback) | 0.71 | 0.84 | 1399.0x / 1187.0x | 🟢 WASM | 18.3% |
| Sample Rates Comparison (44100 Hz) | 0.57 | 0.63 | 1745.0x / 1598.0x | 🟢 WASM | 10.5% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.78 | 1.96 | 563.0x / 511.0x | 🟢 WASM | 10.1% |
| Channel Counts Comparison (2 Channels) | 0.64 | 0.70 | 1551.0x / 1431.0x | 🟢 WASM | 9.4% |
| Filter Types (8 filter types) | 4.39 | 4.75 | 228.0x / 210.0x | 🟢 WASM | 8.2% |
| Sample Rates Comparison (48000 Hz) | 0.63 | 0.67 | 1586.0x / 1492.0x | 🟢 WASM | 6.3% |
| Sample Rates Comparison (8000 Hz) | 0.16 | 0.17 | 6100.0x / 5953.0x | 🟢 WASM | 6.3% |
| Stress Test (100 sources, 400 total nodes) | 69.40 | 73.54 | 14.0x / 14.0x | 🟢 WASM | 6.0% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 7149.90 | 24.58 | 0.0x / 41.0x | 🔴 Rust | 28988.3% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 3366.33 | 17.01 | 0.0x / 59.0x | 🔴 Rust | 19690.3% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 1572.53 | 13.57 | 1.0x / 74.0x | 🔴 Rust | 11488.3% |
| Convolver (Reverb with 1s impulse response) | 1688.89 | 36.34 | 1.0x / 28.0x | 🔴 Rust | 4547.5% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 338.41 | 10.56 | 3.0x / 95.0x | 🔴 Rust | 3104.6% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 302.93 | 96.44 | 100.0x / 58.6x | 🔴 Rust | 214.1% |
| Channel Counts Comparison (8 Channels) | 2.15 | 0.82 | 465.0x / 1223.0x | 🔴 Rust | 162.2% |
| Granular Synthesis (100 grains) | 9.23 | 3.58 | 108.0x / 279.0x | 🔴 Rust | 157.8% |
| Multichannel (5.1 surround) | 10.40 | 4.29 | 96.0x / 233.0x | 🔴 Rust | 142.4% |
| Channel Counts Comparison (6 Channels) | 1.66 | 0.77 | 601.0x / 1298.0x | 🔴 Rust | 115.6% |
| Buffer Playback (50 sound effects) | 7.22 | 3.58 | 139.0x / 279.0x | 🔴 Rust | 101.7% |
| Channel Counts Comparison (4 Channels) | 1.21 | 0.73 | 825.0x / 1375.0x | 🔴 Rust | 65.8% |
| Mixing Performance (100 simultaneous sources) | 8.34 | 6.49 | 5.8x / 7.4x | 🔴 Rust | 28.5% |
| Analyser FFT Sizes (4096) | 0.64 | 0.51 | 1571.0x / 1961.0x | 🔴 Rust | 25.5% |
| Filter Chain (5 cascaded filters) | 1.89 | 1.58 | 529.0x / 635.0x | 🔴 Rust | 19.6% |
| Offline Rendering (1 second of audio) | 0.83 | 0.71 | 1209.0x / 1408.0x | 🔴 Rust | 16.9% |
| IIR Filter (4 cascaded custom filters) | 3.26 | 2.92 | 307.0x / 343.0x | 🔴 Rust | 11.6% |
| Analyser FFT Sizes (256) | 0.58 | 0.52 | 1738.0x / 1927.0x | 🔴 Rust | 11.5% |
| WaveShaper Oversampling Levels (none) | 2.04 | 1.86 | 489.0x / 538.0x | 🔴 Rust | 9.7% |
| Analyser FFT Sizes (512) | 0.54 | 0.50 | 1861.0x / 2006.0x | 🔴 Rust | 8.0% |
| Analyser FFT Sizes (32768) | 0.54 | 0.50 | 1838.0x / 1986.0x | 🔴 Rust | 8.0% |
| Sample Rates Comparison (96000 Hz) | 1.37 | 1.29 | 728.0x / 775.0x | 🔴 Rust | 6.2% |
| Analyser FFT Sizes (2048) | 0.54 | 0.51 | 1864.0x / 1943.0x | 🔴 Rust | 5.9% |
| Analyser FFT Sizes (8192) | 0.54 | 0.51 | 1853.0x / 1947.0x | 🔴 Rust | 5.9% |
| Analyser FFT Sizes (1024) | 0.55 | 0.53 | 1834.0x / 1891.0x | 🔴 Rust | 3.8% |
| Complex Graph (4 parallel chains) | 2.06 | 2.01 | 243.0x / 249.0x | 🔴 Rust | 2.5% |

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
