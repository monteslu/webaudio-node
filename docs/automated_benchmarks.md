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
  - **webaudio-node wins:** 33/60 (**55.0%**)
  - **node-web-audio-api wins:** 27/60 (45.0%)
  - **Similar performance (within 1%):** 0/60 (0.0%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 378.6%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 4.59 | 105.11 | 218.0x / 10.0x | 🟢 WASM | 2190.0% |
| 3D Panner (8 sources with HRTF positioning) | 4.73 | 105.93 | 211.0x / 9.0x | 🟢 WASM | 2139.5% |
| Panner Distance Models (Exponential) | 4.70 | 104.93 | 213.0x / 10.0x | 🟢 WASM | 2132.6% |
| Panner Distance Models (Linear) | 4.72 | 105.07 | 212.0x / 10.0x | 🟢 WASM | 2126.1% |
| Panner Distance Models (Inverse) | 4.74 | 104.70 | 211.0x / 10.0x | 🟢 WASM | 2108.9% |
| WaveShaper Oversampling Levels (4x) | 2.03 | 7.66 | 492.0x / 131.0x | 🟢 WASM | 277.3% |
| Filter Modulation (4 oscillators with auto-wah) | 2.23 | 6.33 | 448.0x / 158.0x | 🟢 WASM | 183.9% |
| Delay Modulation (4 sources with chorus effect) | 2.65 | 7.24 | 377.0x / 138.0x | 🟢 WASM | 173.2% |
| Ring Modulation (8 voices) | 2.63 | 6.48 | 381.0x / 154.0x | 🟢 WASM | 146.4% |
| WaveShaper Oversampling Levels (2x) | 2.06 | 5.03 | 484.0x / 199.0x | 🟢 WASM | 144.2% |
| WaveShaper (1 second with 2x oversampling) | 0.61 | 1.25 | 1650.0x / 802.0x | 🟢 WASM | 104.9% |
| ConstantSource (16 oscillators with LFO modulation) | 4.11 | 8.29 | 243.0x / 121.0x | 🟢 WASM | 101.7% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.73 | 3.10 | 577.0x / 323.0x | 🟢 WASM | 79.2% |
| Analyser FFT Sizes (16384) | 0.54 | 0.91 | 1861.0x / 1104.0x | 🟢 WASM | 68.5% |
| AudioParam Automation (1000 events) | 0.26 | 0.43 | 0.8x / 2.1x | 🟢 WASM | 65.4% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 2.01 | 3.02 | 498.0x / 331.0x | 🟢 WASM | 50.2% |
| Channel Counts Comparison (1 Channel) | 0.46 | 0.66 | 2198.0x / 1526.0x | 🟢 WASM | 43.5% |
| Oscillators (16 oscillators, 4 waveform types) | 4.08 | 5.66 | 245.0x / 177.0x | 🟢 WASM | 38.7% |
| Node Creation (150 nodes per iteration) | 3.26 | 4.43 | 46.0x / 33.9x | 🟢 WASM | 35.9% |
| Heavy Processing (Full mixing/mastering chain) | 13.45 | 18.18 | 74.0x / 55.0x | 🟢 WASM | 35.2% |
| Gain Ramping (20 crossfades) | 0.74 | 1.00 | 1358.0x / 1000.0x | 🟢 WASM | 35.1% |
| Envelope Generator (16 notes with ADSR) | 1.97 | 2.65 | 506.0x / 377.0x | 🟢 WASM | 34.5% |
| Delay Node (1 second with feedback) | 0.67 | 0.87 | 1492.0x / 1156.0x | 🟢 WASM | 29.9% |
| Channel Operations (split/process/merge) | 1.01 | 1.31 | 993.0x / 764.0x | 🟢 WASM | 29.7% |
| Stereo Panner (16 sources across stereo field) | 5.31 | 6.76 | 188.0x / 148.0x | 🟢 WASM | 27.3% |
| Analyser (FFT with 2048 fftSize) | 1.88 | 2.34 | 533.0x / 427.0x | 🟢 WASM | 24.5% |
| Sample Rates Comparison (16000 Hz) | 0.21 | 0.25 | 4665.0x / 3933.0x | 🟢 WASM | 19.0% |
| Sample Rates Comparison (22050 Hz) | 0.29 | 0.33 | 3434.0x / 3029.0x | 🟢 WASM | 13.8% |
| Sample Rates Comparison (8000 Hz) | 0.15 | 0.17 | 6499.0x / 5770.0x | 🟢 WASM | 13.3% |
| Channel Counts Comparison (2 Channels) | 0.62 | 0.67 | 1625.0x / 1484.0x | 🟢 WASM | 8.1% |
| Filter Types (8 filter types) | 4.38 | 4.67 | 228.0x / 214.0x | 🟢 WASM | 6.6% |
| Sample Rates Comparison (48000 Hz) | 0.64 | 0.67 | 1565.0x / 1487.0x | 🟢 WASM | 4.7% |
| Sample Rates Comparison (44100 Hz) | 0.59 | 0.61 | 1707.0x / 1644.0x | 🟢 WASM | 3.4% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 7133.77 | 24.97 | 0.0x / 40.0x | 🔴 Rust | 28469.4% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 3377.85 | 16.92 | 0.0x / 59.0x | 🔴 Rust | 19863.7% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 1575.03 | 13.41 | 1.0x / 75.0x | 🔴 Rust | 11645.2% |
| Convolver (Reverb with 1s impulse response) | 1685.26 | 35.28 | 1.0x / 28.0x | 🔴 Rust | 4676.8% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 339.33 | 10.50 | 3.0x / 95.0x | 🔴 Rust | 3131.7% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 303.00 | 95.69 | 100.1x / 59.9x | 🔴 Rust | 216.6% |
| Granular Synthesis (100 grains) | 9.50 | 3.20 | 105.0x / 313.0x | 🔴 Rust | 196.9% |
| Channel Counts Comparison (8 Channels) | 1.99 | 0.80 | 502.0x / 1255.0x | 🔴 Rust | 148.7% |
| Multichannel (5.1 surround) | 10.29 | 4.33 | 97.0x / 231.0x | 🔴 Rust | 137.6% |
| Channel Counts Comparison (6 Channels) | 1.60 | 0.73 | 624.0x / 1375.0x | 🔴 Rust | 119.2% |
| Buffer Playback (50 sound effects) | 7.14 | 3.52 | 140.0x / 284.0x | 🔴 Rust | 102.8% |
| Channel Counts Comparison (4 Channels) | 1.17 | 0.72 | 855.0x / 1395.0x | 🔴 Rust | 62.5% |
| Mixing Performance (100 simultaneous sources) | 8.56 | 6.33 | 5.6x / 7.6x | 🔴 Rust | 35.2% |
| Offline Rendering (1 second of audio) | 0.87 | 0.68 | 1143.0x / 1475.0x | 🔴 Rust | 27.9% |
| Analyser FFT Sizes (4096) | 0.61 | 0.50 | 1626.0x / 2001.0x | 🔴 Rust | 22.0% |
| Filter Chain (5 cascaded filters) | 1.88 | 1.55 | 532.0x / 644.0x | 🔴 Rust | 21.3% |
| Analyser FFT Sizes (32768) | 0.56 | 0.48 | 1797.0x / 2062.0x | 🔴 Rust | 16.7% |
| Analyser FFT Sizes (256) | 0.57 | 0.50 | 1764.0x / 2011.0x | 🔴 Rust | 14.0% |
| Analyser FFT Sizes (512) | 0.54 | 0.49 | 1855.0x / 2046.0x | 🔴 Rust | 10.2% |
| IIR Filter (4 cascaded custom filters) | 3.22 | 2.95 | 310.0x / 338.0x | 🔴 Rust | 9.2% |
| WaveShaper Oversampling Levels (none) | 2.03 | 1.87 | 493.0x / 535.0x | 🔴 Rust | 8.6% |
| Stress Test (100 sources, 400 total nodes) | 69.72 | 64.47 | 14.0x / 16.0x | 🔴 Rust | 8.1% |
| Sample Rates Comparison (96000 Hz) | 1.35 | 1.25 | 740.0x / 798.0x | 🔴 Rust | 8.0% |
| Analyser FFT Sizes (1024) | 0.54 | 0.50 | 1854.0x / 2008.0x | 🔴 Rust | 8.0% |
| Analyser FFT Sizes (2048) | 0.55 | 0.52 | 1831.0x / 1936.0x | 🔴 Rust | 5.8% |
| Analyser FFT Sizes (8192) | 0.53 | 0.51 | 1888.0x / 1950.0x | 🔴 Rust | 3.9% |
| Complex Graph (4 parallel chains) | 2.04 | 2.01 | 245.0x / 248.0x | 🔴 Rust | 1.5% |

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
