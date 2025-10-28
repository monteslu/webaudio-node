# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** darwin (arm64)
> **CPU:** Apple M2 Max
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 61
- **Successful Comparisons:** 47 (both implementations completed)
  - **webaudio-node wins:** 13/47 (**27.7%**)
  - **node-web-audio-api wins:** 34/47 (72.3%)
  - **Similar performance (within 1%):** 0/47 (0.0%)
- **Failed Benchmarks:** 14
  - **webaudio-node failed:** 13
  - **node-web-audio-api failed:** 0
  - **Both failed:** 1
- **Average Speedup (when webaudio-node faster):** 752.4%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 5.44 | 107.45 | 184.0x / 9.0x | 🟢 WASM | 1875.2% |
| 3D Panner (8 sources with HRTF positioning) | 5.48 | 107.66 | 182.0x / 9.0x | 🟢 WASM | 1864.6% |
| Panner Distance Models (Inverse) | 5.44 | 105.44 | 184.0x / 9.0x | 🟢 WASM | 1838.2% |
| Panner Distance Models (Exponential) | 5.46 | 105.42 | 183.0x / 9.0x | 🟢 WASM | 1830.8% |
| Panner Distance Models (Linear) | 5.46 | 105.38 | 183.0x / 9.0x | 🟢 WASM | 1830.0% |
| Filter Modulation (4 oscillators with auto-wah) | 3.00 | 6.39 | 333.0x / 157.0x | 🟢 WASM | 113.0% |
| Delay Modulation (4 sources with chorus effect) | 3.39 | 7.22 | 295.0x / 138.0x | 🟢 WASM | 113.0% |
| Ring Modulation (8 voices) | 3.40 | 6.51 | 294.0x / 154.0x | 🟢 WASM | 91.5% |
| AudioParam Automation (1000 events) | 0.25 | 0.45 | 1.7x / 2.1x | 🟢 WASM | 80.0% |
| ConstantSource (16 oscillators with LFO modulation) | 5.00 | 8.36 | 200.0x / 120.0x | 🟢 WASM | 67.2% |
| Node Creation (150 nodes per iteration) | 3.18 | 4.33 | 47.2x / 34.6x | 🟢 WASM | 36.2% |
| Stereo Panner (16 sources across stereo field) | 6.19 | 7.66 | 162.0x / 131.0x | 🟢 WASM | 23.7% |
| Oscillators (16 oscillators, 4 waveform types) | 4.85 | 5.73 | 206.0x / 175.0x | 🟢 WASM | 18.1% |
| Channel Counts Comparison (8 Channels) | 5.07 | 0.80 | 197.0x / 1257.0x | 🔴 Rust | 533.8% |
| Channel Counts Comparison (6 Channels) | 3.71 | 0.75 | 270.0x / 1337.0x | 🔴 Rust | 394.7% |
| Channel Counts Comparison (4 Channels) | 2.57 | 0.71 | 390.0x / 1401.0x | 🔴 Rust | 262.0% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 304.00 | 97.90 | 113.3x / 57.9x | 🔴 Rust | 210.5% |
| Multichannel (5.1 surround) | 12.72 | 4.26 | 79.0x / 235.0x | 🔴 Rust | 198.6% |
| Analyser FFT Sizes (256) | 1.37 | 0.51 | 728.0x / 1979.0x | 🔴 Rust | 168.6% |
| Analyser FFT Sizes (1024) | 1.26 | 0.49 | 793.0x / 2020.0x | 🔴 Rust | 157.1% |
| Analyser FFT Sizes (512) | 1.25 | 0.49 | 798.0x / 2041.0x | 🔴 Rust | 155.1% |
| Analyser FFT Sizes (2048) | 1.25 | 0.49 | 799.0x / 2021.0x | 🔴 Rust | 155.1% |
| Analyser FFT Sizes (8192) | 1.27 | 0.50 | 787.0x / 2015.0x | 🔴 Rust | 154.0% |
| Analyser FFT Sizes (16384) | 1.26 | 0.50 | 796.0x / 1981.0x | 🔴 Rust | 152.0% |
| Analyser FFT Sizes (4096) | 1.25 | 0.50 | 799.0x / 1990.0x | 🔴 Rust | 150.0% |
| Analyser FFT Sizes (32768) | 1.25 | 0.52 | 798.0x / 1933.0x | 🔴 Rust | 140.4% |
| Delay Node (1 second with feedback) | 2.12 | 0.91 | 471.0x / 1100.0x | 🔴 Rust | 133.0% |
| Sample Rates Comparison (96000 Hz) | 2.75 | 1.29 | 364.0x / 775.0x | 🔴 Rust | 113.2% |
| Sample Rates Comparison (44100 Hz) | 1.27 | 0.63 | 784.0x / 1589.0x | 🔴 Rust | 101.6% |
| Sample Rates Comparison (48000 Hz) | 1.35 | 0.67 | 739.0x / 1489.0x | 🔴 Rust | 101.5% |
| Channel Counts Comparison (2 Channels) | 1.35 | 0.68 | 743.0x / 1481.0x | 🔴 Rust | 98.5% |
| Sample Rates Comparison (22050 Hz) | 0.63 | 0.34 | 1589.0x / 2940.0x | 🔴 Rust | 85.3% |
| Sample Rates Comparison (16000 Hz) | 0.46 | 0.26 | 2188.0x / 3799.0x | 🔴 Rust | 76.9% |
| Filter Chain (5 cascaded filters) | 2.66 | 1.58 | 376.0x / 631.0x | 🔴 Rust | 68.4% |
| Gain Ramping (20 crossfades) | 1.55 | 1.04 | 646.0x / 963.0x | 🔴 Rust | 49.0% |
| Complex Graph (4 parallel chains) | 2.74 | 1.97 | 183.0x / 254.0x | 🔴 Rust | 39.1% |
| Dynamics Compressor (4 sources with aggressive settings) | 2.67 | 1.94 | 374.0x / 515.0x | 🔴 Rust | 37.6% |
| Sample Rates Comparison (8000 Hz) | 0.22 | 0.16 | 4463.0x / 6310.0x | 🔴 Rust | 37.5% |
| Channel Counts Comparison (1 Channel) | 0.88 | 0.64 | 1131.0x / 1562.0x | 🔴 Rust | 37.5% |
| Mixing Performance (100 simultaneous sources) | 8.38 | 6.36 | 5.7x / 7.5x | 🔴 Rust | 31.8% |
| WaveShaper (1 second with 2x oversampling) | 1.66 | 1.26 | 601.0x / 794.0x | 🔴 Rust | 31.7% |
| Analyser (FFT with 2048 fftSize) | 2.82 | 2.30 | 354.0x / 435.0x | 🔴 Rust | 22.6% |
| Channel Operations (split/process/merge) | 1.83 | 1.50 | 546.0x / 668.0x | 🔴 Rust | 22.0% |
| Envelope Generator (16 notes with ADSR) | 2.79 | 2.52 | 359.0x / 397.0x | 🔴 Rust | 10.7% |
| Stress Test (100 sources, 400 total nodes) | 71.74 | 66.30 | 14.0x / 15.0x | 🔴 Rust | 8.2% |
| Filter Types (8 filter types) | 5.17 | 4.81 | 193.0x / 208.0x | 🔴 Rust | 7.5% |
| Offline Rendering (1 second of audio) | 0.72 | 0.68 | 1382.0x / 1460.0x | 🔴 Rust | 5.9% |
| Convolver (Reverb with 1s impulse response) | FAILED | 35.19 | N/A / 28.0x | ❌ webaudio-node FAILED | N/A |
| Buffer Playback (50 sound effects) | FAILED | 3.58 | N/A / 279.0x | ❌ webaudio-node FAILED | N/A |
| IIR Filter (4 cascaded custom filters) | FAILED | 2.99 | N/A / 334.0x | ❌ webaudio-node FAILED | N/A |
| Heavy Processing (Full mixing/mastering chain) | FAILED | 18.70 | N/A / 53.0x | ❌ webaudio-node FAILED | N/A |
| PeriodicWave (8 custom waveforms, 32 harmonics) | FAILED | 3.28 | N/A / 304.0x | ❌ webaudio-node FAILED | N/A |
| Granular Synthesis (100 grains) | FAILED | 3.44 | N/A / 291.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (none) | FAILED | 1.90 | N/A / 526.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (2x) | FAILED | 5.12 | N/A / 195.0x | ❌ webaudio-node FAILED | N/A |
| WaveShaper Oversampling Levels (4x) | FAILED | 7.83 | N/A / 128.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | FAILED | 10.70 | N/A / 93.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | FAILED | 13.68 | N/A / 73.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (1s (48000 samples)) | FAILED | 17.40 | N/A / 57.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (2s (96000 samples)) | FAILED | 24.61 | N/A / 41.0x | ❌ webaudio-node FAILED | N/A |
| Convolver Impulse Response Sizes (4s (192000 samples)) | FAILED | FAILED | N/A / N/A | ❌ BOTH FAILED | N/A |

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
