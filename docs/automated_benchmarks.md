# Automated Benchmark Results

> **Last Updated:** 2025-10-29
> **Platform:** darwin (arm64)
> **CPU:** Apple M2 Max
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 60
- **Successful Comparisons:** 60 (both implementations completed)
  - **webaudio-node wins:** 52/60 (**86.7%**)
  - **node-web-audio-api wins:** 7/60 (11.7%)
  - **Similar performance (within 1%):** 1/60 (1.7%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 1839.9%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 0.69 | 106.49 | 1460.0x / 9.0x | 🟢 WASM | 15333.3% |
| Panner Distance Models (Exponential) | 0.69 | 103.46 | 1442.0x / 10.0x | 🟢 WASM | 14894.2% |
| Panner Distance Models (Inverse) | 0.70 | 104.71 | 1435.0x / 10.0x | 🟢 WASM | 14858.6% |
| Panner Distance Models (Linear) | 0.71 | 104.83 | 1401.0x / 10.0x | 🟢 WASM | 14664.8% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 0.26 | 24.10 | 3903.0x / 42.0x | 🟢 WASM | 9169.2% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 0.29 | 16.98 | 3494.0x / 59.0x | 🟢 WASM | 5755.2% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 0.25 | 13.62 | 4014.0x / 73.0x | 🟢 WASM | 5348.0% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 0.26 | 10.56 | 3777.0x / 95.0x | 🟢 WASM | 3961.5% |
| 3D Panner (8 sources with HRTF positioning) | 4.70 | 105.93 | 213.0x / 9.0x | 🟢 WASM | 2153.8% |
| WaveShaper Oversampling Levels (4x) | 0.38 | 7.70 | 2624.0x / 130.0x | 🟢 WASM | 1926.3% |
| Sample Rates Comparison (8000 Hz) | 0.09 | 1.32 | 10617.0x / 760.0x | 🟢 WASM | 1366.7% |
| WaveShaper Oversampling Levels (2x) | 0.40 | 5.04 | 2478.0x / 198.0x | 🟢 WASM | 1160.0% |
| WaveShaper Oversampling Levels (none) | 0.42 | 1.83 | 2389.0x / 546.0x | 🟢 WASM | 335.7% |
| Channel Counts Comparison (1 Channel) | 0.16 | 0.66 | 6156.0x / 1509.0x | 🟢 WASM | 312.5% |
| Sample Rates Comparison (16000 Hz) | 0.07 | 0.27 | 15086.0x / 3756.0x | 🟢 WASM | 285.7% |
| Sample Rates Comparison (22050 Hz) | 0.10 | 0.36 | 10308.0x / 2809.0x | 🟢 WASM | 260.0% |
| Channel Counts Comparison (2 Channels) | 0.19 | 0.67 | 5295.0x / 1498.0x | 🟢 WASM | 252.6% |
| Sample Rates Comparison (44100 Hz) | 0.18 | 0.63 | 5503.0x / 1599.0x | 🟢 WASM | 250.0% |
| Sample Rates Comparison (48000 Hz) | 0.21 | 0.72 | 4831.0x / 1397.0x | 🟢 WASM | 242.9% |
| Ring Modulation (8 voices) | 2.54 | 8.51 | 394.0x / 117.0x | 🟢 WASM | 235.0% |
| Filter Modulation (4 oscillators with auto-wah) | 2.20 | 6.70 | 454.0x / 149.0x | 🟢 WASM | 204.5% |
| Multichannel (5.1 surround) | 1.68 | 5.10 | 594.0x / 196.0x | 🟢 WASM | 203.6% |
| Sample Rates Comparison (96000 Hz) | 0.45 | 1.33 | 2199.0x / 753.0x | 🟢 WASM | 195.6% |
| Delay Modulation (4 sources with chorus effect) | 2.53 | 7.39 | 395.0x / 135.0x | 🟢 WASM | 192.1% |
| Analyser FFT Sizes (8192) | 0.18 | 0.50 | 5664.0x / 1997.0x | 🟢 WASM | 177.8% |
| Analyser FFT Sizes (16384) | 0.18 | 0.50 | 5475.0x / 2015.0x | 🟢 WASM | 177.8% |
| Analyser FFT Sizes (32768) | 0.18 | 0.49 | 5671.0x / 2031.0x | 🟢 WASM | 172.2% |
| Analyser FFT Sizes (1024) | 0.18 | 0.48 | 5538.0x / 2077.0x | 🟢 WASM | 166.7% |
| Analyser FFT Sizes (512) | 0.19 | 0.49 | 5313.0x / 2022.0x | 🟢 WASM | 157.9% |
| Channel Counts Comparison (4 Channels) | 0.36 | 0.91 | 2776.0x / 1105.0x | 🟢 WASM | 152.8% |
| Analyser FFT Sizes (2048) | 0.20 | 0.48 | 5121.0x / 2069.0x | 🟢 WASM | 140.0% |
| ConstantSource (16 oscillators with LFO modulation) | 3.89 | 9.32 | 257.0x / 107.0x | 🟢 WASM | 139.6% |
| WaveShaper (1 second with 2x oversampling) | 0.59 | 1.28 | 1688.0x / 784.0x | 🟢 WASM | 116.9% |
| Analyser FFT Sizes (256) | 0.23 | 0.49 | 4305.0x / 2052.0x | 🟢 WASM | 113.0% |
| Analyser FFT Sizes (4096) | 0.28 | 0.49 | 3601.0x / 2060.0x | 🟢 WASM | 75.0% |
| AudioParam Automation (1000 events) | 0.27 | 0.44 | 0.7x / 2.1x | 🟢 WASM | 63.0% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.90 | 2.98 | 526.0x / 336.0x | 🟢 WASM | 56.8% |
| Gain Ramping (20 crossfades) | 0.66 | 1.02 | 1519.0x / 982.0x | 🟢 WASM | 54.5% |
| Oscillators (16 oscillators, 4 waveform types) | 3.78 | 5.77 | 264.0x / 173.0x | 🟢 WASM | 52.6% |
| Node Creation (150 nodes per iteration) | 3.04 | 4.54 | 49.4x / 33.0x | 🟢 WASM | 49.3% |
| Analyser (FFT with 2048 fftSize) | 1.67 | 2.36 | 600.0x / 424.0x | 🟢 WASM | 41.3% |
| Channel Counts Comparison (6 Channels) | 0.55 | 0.77 | 1808.0x / 1296.0x | 🟢 WASM | 40.0% |
| Heavy Processing (Full mixing/mastering chain) | 13.43 | 18.18 | 74.0x / 55.0x | 🟢 WASM | 35.4% |
| Channel Operations (split/process/merge) | 0.98 | 1.30 | 1015.0x / 770.0x | 🟢 WASM | 32.7% |
| Stereo Panner (16 sources across stereo field) | 5.11 | 6.66 | 196.0x / 150.0x | 🟢 WASM | 30.3% |
| Channel Counts Comparison (8 Channels) | 0.73 | 0.86 | 1378.0x / 1157.0x | 🟢 WASM | 17.8% |
| Filter Types (8 filter types) | 4.23 | 4.92 | 236.0x / 203.0x | 🟢 WASM | 16.3% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.66 | 1.92 | 603.0x / 521.0x | 🟢 WASM | 15.7% |
| Buffer Playback (50 sound effects) | 6.48 | 6.88 | 154.0x / 145.0x | 🟢 WASM | 6.2% |
| Delay Node (1 second with feedback) | 0.67 | 0.70 | 1483.0x / 1433.0x | 🟢 WASM | 4.5% |
| Filter Chain (5 cascaded filters) | 1.76 | 1.82 | 567.0x / 550.0x | 🟢 WASM | 3.4% |
| Envelope Generator (16 notes with ADSR) | 2.52 | 2.56 | 397.0x / 390.0x | 🟢 WASM | 1.6% |
| Convolver (Reverb with 1s impulse response) | 202.72 | 37.11 | 5.0x / 27.0x | 🔴 Rust | 446.3% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 300.61 | 70.54 | 96.6x / 68.1x | 🔴 Rust | 326.2% |
| Granular Synthesis (100 grains) | 8.62 | 5.02 | 116.0x / 199.0x | 🔴 Rust | 71.7% |
| Mixing Performance (100 simultaneous sources) | 8.34 | 6.38 | 5.8x / 7.5x | 🔴 Rust | 30.7% |
| Offline Rendering (1 second of audio) | 0.86 | 0.66 | 1164.0x / 1514.0x | 🔴 Rust | 30.3% |
| IIR Filter (4 cascaded custom filters) | 3.27 | 3.01 | 306.0x / 332.0x | 🔴 Rust | 8.6% |
| Stress Test (100 sources, 400 total nodes) | 68.06 | 64.98 | 15.0x / 15.0x | 🔴 Rust | 4.7% |
| Complex Graph (4 parallel chains) | 1.91 | 1.92 | 262.0x / 261.0x | 🟡 Similar | 0.5% |

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
