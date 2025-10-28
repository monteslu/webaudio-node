# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** darwin (arm64)
> **CPU:** Apple M2 Max
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 61
- **Successful Comparisons:** 60 (both implementations completed)
  - **webaudio-node wins:** 18/60 (**30.0%**)
  - **node-web-audio-api wins:** 42/60 (70.0%)
  - **Similar performance (within 1%):** 0/60 (0.0%)
- **Failed Benchmarks:** 1
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 1
- **Average Speedup (when webaudio-node faster):** 549.2%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Exponential) | 5.35 | 104.05 | 187.0x / 10.0x | 🟢 WASM | 1844.9% |
| Panner Distance Models (Inverse) | 5.35 | 103.26 | 187.0x / 10.0x | 🟢 WASM | 1830.1% |
| Panner Distance Models (Linear) | 5.50 | 104.30 | 182.0x / 10.0x | 🟢 WASM | 1796.4% |
| AudioListener (8 sources, 50 position/orientation changes) | 5.52 | 104.51 | 181.0x / 10.0x | 🟢 WASM | 1793.3% |
| 3D Panner (8 sources with HRTF positioning) | 5.53 | 104.69 | 181.0x / 10.0x | 🟢 WASM | 1793.1% |
| WaveShaper Oversampling Levels (4x) | 2.86 | 7.77 | 349.0x / 129.0x | 🟢 WASM | 171.7% |
| Delay Modulation (4 sources with chorus effect) | 3.43 | 7.14 | 292.0x / 140.0x | 🟢 WASM | 108.2% |
| Filter Modulation (4 oscillators with auto-wah) | 3.12 | 6.37 | 320.0x / 157.0x | 🟢 WASM | 104.2% |
| Ring Modulation (8 voices) | 3.42 | 6.51 | 292.0x / 154.0x | 🟢 WASM | 90.4% |
| WaveShaper Oversampling Levels (2x) | 2.89 | 5.08 | 346.0x / 197.0x | 🟢 WASM | 75.8% |
| AudioParam Automation (1000 events) | 0.25 | 0.43 | 1.9x / 2.1x | 🟢 WASM | 72.0% |
| ConstantSource (16 oscillators with LFO modulation) | 4.97 | 8.40 | 201.0x / 119.0x | 🟢 WASM | 69.0% |
| Node Creation (150 nodes per iteration) | 3.24 | 4.50 | 46.2x / 33.4x | 🟢 WASM | 38.9% |
| WaveShaper (1 second with 2x oversampling) | 0.93 | 1.25 | 1078.0x / 799.0x | 🟢 WASM | 34.4% |
| Heavy Processing (Full mixing/mastering chain) | 14.18 | 18.48 | 71.0x / 54.0x | 🟢 WASM | 30.3% |
| Oscillators (16 oscillators, 4 waveform types) | 4.81 | 5.64 | 208.0x / 177.0x | 🟢 WASM | 17.3% |
| Stereo Panner (16 sources across stereo field) | 6.11 | 6.68 | 164.0x / 150.0x | 🟢 WASM | 9.3% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 2.81 | 3.00 | 356.0x / 333.0x | 🟢 WASM | 6.8% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 7117.08 | 24.08 | 0.0x / 42.0x | 🔴 Rust | 29456.0% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 3385.96 | 17.09 | 0.0x / 59.0x | 🔴 Rust | 19712.5% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 1584.04 | 13.42 | 1.0x / 75.0x | 🔴 Rust | 11703.6% |
| Convolver (Reverb with 1s impulse response) | 1694.03 | 34.74 | 1.0x / 29.0x | 🔴 Rust | 4776.3% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 342.47 | 10.66 | 3.0x / 94.0x | 🔴 Rust | 3112.7% |
| Channel Counts Comparison (8 Channels) | 5.30 | 0.80 | 189.0x / 1255.0x | 🔴 Rust | 562.5% |
| Channel Counts Comparison (6 Channels) | 4.11 | 0.75 | 243.0x / 1333.0x | 🔴 Rust | 448.0% |
| Channel Counts Comparison (4 Channels) | 2.68 | 0.70 | 373.0x / 1424.0x | 🔴 Rust | 282.9% |
| Granular Synthesis (100 grains) | 10.49 | 3.20 | 95.0x / 313.0x | 🔴 Rust | 227.8% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 302.81 | 96.63 | 104.0x / 58.9x | 🔴 Rust | 213.4% |
| Multichannel (5.1 surround) | 13.09 | 4.26 | 76.0x / 235.0x | 🔴 Rust | 207.3% |
| Analyser FFT Sizes (256) | 1.39 | 0.50 | 720.0x / 2018.0x | 🔴 Rust | 178.0% |
| Analyser FFT Sizes (512) | 1.30 | 0.49 | 768.0x / 2052.0x | 🔴 Rust | 165.3% |
| Analyser FFT Sizes (1024) | 1.29 | 0.49 | 774.0x / 2022.0x | 🔴 Rust | 163.3% |
| Analyser FFT Sizes (4096) | 1.28 | 0.49 | 784.0x / 2033.0x | 🔴 Rust | 161.2% |
| Analyser FFT Sizes (2048) | 1.29 | 0.50 | 776.0x / 1981.0x | 🔴 Rust | 158.0% |
| Analyser FFT Sizes (8192) | 1.28 | 0.50 | 783.0x / 1983.0x | 🔴 Rust | 156.0% |
| Analyser FFT Sizes (32768) | 1.26 | 0.50 | 794.0x / 1994.0x | 🔴 Rust | 152.0% |
| Buffer Playback (50 sound effects) | 8.66 | 3.58 | 115.0x / 279.0x | 🔴 Rust | 141.9% |
| Sample Rates Comparison (96000 Hz) | 2.84 | 1.20 | 352.0x / 836.0x | 🔴 Rust | 136.7% |
| Sample Rates Comparison (48000 Hz) | 1.38 | 0.62 | 724.0x / 1616.0x | 🔴 Rust | 122.6% |
| Sample Rates Comparison (44100 Hz) | 1.26 | 0.58 | 795.0x / 1731.0x | 🔴 Rust | 117.2% |
| Channel Counts Comparison (2 Channels) | 1.39 | 0.65 | 717.0x / 1541.0x | 🔴 Rust | 113.8% |
| Sample Rates Comparison (8000 Hz) | 0.35 | 0.17 | 2852.0x / 5948.0x | 🔴 Rust | 105.9% |
| Sample Rates Comparison (22050 Hz) | 0.64 | 0.32 | 1562.0x / 3078.0x | 🔴 Rust | 100.0% |
| Filter Chain (5 cascaded filters) | 3.00 | 1.53 | 334.0x / 652.0x | 🔴 Rust | 96.1% |
| Sample Rates Comparison (16000 Hz) | 0.49 | 0.26 | 2044.0x / 3849.0x | 🔴 Rust | 88.5% |
| WaveShaper Oversampling Levels (none) | 3.04 | 1.87 | 328.0x / 535.0x | 🔴 Rust | 62.6% |
| Channel Counts Comparison (1 Channel) | 0.99 | 0.63 | 1009.0x / 1592.0x | 🔴 Rust | 57.1% |
| Gain Ramping (20 crossfades) | 1.52 | 1.00 | 660.0x / 1001.0x | 🔴 Rust | 52.0% |
| Channel Operations (split/process/merge) | 1.82 | 1.29 | 549.0x / 773.0x | 🔴 Rust | 41.1% |
| IIR Filter (4 cascaded custom filters) | 4.06 | 2.99 | 246.0x / 335.0x | 🔴 Rust | 35.8% |
| Mixing Performance (100 simultaneous sources) | 8.57 | 6.37 | 5.6x / 7.5x | 🔴 Rust | 34.5% |
| Dynamics Compressor (4 sources with aggressive settings) | 2.50 | 1.94 | 399.0x / 516.0x | 🔴 Rust | 28.9% |
| Offline Rendering (1 second of audio) | 0.84 | 0.68 | 1194.0x / 1468.0x | 🔴 Rust | 23.5% |
| Analyser FFT Sizes (16384) | 1.27 | 1.03 | 788.0x / 968.0x | 🔴 Rust | 23.3% |
| Analyser (FFT with 2048 fftSize) | 2.66 | 2.28 | 376.0x / 438.0x | 🔴 Rust | 16.7% |
| Complex Graph (4 parallel chains) | 2.35 | 2.07 | 213.0x / 242.0x | 🔴 Rust | 13.5% |
| Envelope Generator (16 notes with ADSR) | 2.82 | 2.52 | 354.0x / 397.0x | 🔴 Rust | 11.9% |
| Stress Test (100 sources, 400 total nodes) | 71.15 | 63.91 | 14.0x / 16.0x | 🔴 Rust | 11.3% |
| Filter Types (8 filter types) | 5.23 | 4.73 | 191.0x / 211.0x | 🔴 Rust | 10.6% |
| Delay Node (1 second with feedback) | 1.10 | 1.05 | 912.0x / 956.0x | 🔴 Rust | 4.8% |
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
