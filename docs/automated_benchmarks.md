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
  - **webaudio-node wins:** 53/60 (**88.3%**)
  - **node-web-audio-api wins:** 6/60 (10.0%)
  - **Similar performance (within 1%):** 1/60 (1.7%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 1872.8%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Inverse) | 0.66 | 106.32 | 1506.0x / 9.0x | 🟢 WASM | 16009.1% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.67 | 106.61 | 1503.0x / 9.0x | 🟢 WASM | 15811.9% |
| Panner Distance Models (Linear) | 0.68 | 106.66 | 1461.0x / 9.0x | 🟢 WASM | 15585.3% |
| Panner Distance Models (Exponential) | 0.69 | 105.76 | 1454.0x / 9.0x | 🟢 WASM | 15227.5% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 0.25 | 23.92 | 4038.0x / 42.0x | 🟢 WASM | 9468.0% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 0.26 | 16.88 | 3803.0x / 59.0x | 🟢 WASM | 6392.3% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 0.24 | 13.48 | 4106.0x / 74.0x | 🟢 WASM | 5516.7% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 0.29 | 10.52 | 3442.0x / 95.0x | 🟢 WASM | 3527.6% |
| 3D Panner (8 sources with HRTF positioning) | 4.35 | 105.05 | 230.0x / 10.0x | 🟢 WASM | 2314.9% |
| WaveShaper Oversampling Levels (4x) | 0.38 | 7.61 | 2635.0x / 131.0x | 🟢 WASM | 1902.6% |
| WaveShaper Oversampling Levels (2x) | 0.38 | 5.06 | 2617.0x / 198.0x | 🟢 WASM | 1231.6% |
| Analyser FFT Sizes (1024) | 0.19 | 2.39 | 5296.0x / 418.0x | 🟢 WASM | 1157.9% |
| Sample Rates Comparison (8000 Hz) | 0.11 | 0.56 | 8877.0x / 1778.0x | 🟢 WASM | 409.1% |
| Analyser FFT Sizes (512) | 0.19 | 0.83 | 5337.0x / 1199.0x | 🟢 WASM | 336.8% |
| WaveShaper Oversampling Levels (none) | 0.43 | 1.81 | 2343.0x / 554.0x | 🟢 WASM | 320.9% |
| Channel Counts Comparison (1 Channel) | 0.17 | 0.63 | 6054.0x / 1596.0x | 🟢 WASM | 270.6% |
| Sample Rates Comparison (22050 Hz) | 0.09 | 0.33 | 10861.0x / 3008.0x | 🟢 WASM | 266.7% |
| Sample Rates Comparison (16000 Hz) | 0.08 | 0.27 | 12426.0x / 3764.0x | 🟢 WASM | 237.5% |
| Channel Counts Comparison (2 Channels) | 0.20 | 0.66 | 5009.0x / 1513.0x | 🟢 WASM | 230.0% |
| Sample Rates Comparison (48000 Hz) | 0.20 | 0.65 | 4886.0x / 1548.0x | 🟢 WASM | 225.0% |
| Delay Modulation (4 sources with chorus effect) | 2.32 | 7.07 | 431.0x / 141.0x | 🟢 WASM | 204.7% |
| Filter Modulation (4 oscillators with auto-wah) | 2.08 | 6.28 | 482.0x / 159.0x | 🟢 WASM | 201.9% |
| Sample Rates Comparison (44100 Hz) | 0.20 | 0.60 | 4945.0x / 1675.0x | 🟢 WASM | 200.0% |
| Ring Modulation (8 voices) | 2.27 | 6.38 | 441.0x / 157.0x | 🟢 WASM | 181.1% |
| Sample Rates Comparison (96000 Hz) | 0.45 | 1.25 | 2236.0x / 797.0x | 🟢 WASM | 177.8% |
| Multichannel (5.1 surround) | 1.60 | 4.28 | 624.0x / 234.0x | 🟢 WASM | 167.5% |
| Analyser FFT Sizes (8192) | 0.20 | 0.50 | 5041.0x / 2013.0x | 🟢 WASM | 150.0% |
| Analyser FFT Sizes (16384) | 0.20 | 0.50 | 5012.0x / 2016.0x | 🟢 WASM | 150.0% |
| Analyser FFT Sizes (32768) | 0.20 | 0.49 | 5068.0x / 2023.0x | 🟢 WASM | 145.0% |
| Analyser FFT Sizes (2048) | 0.20 | 0.47 | 4910.0x / 2118.0x | 🟢 WASM | 135.0% |
| WaveShaper (1 second with 2x oversampling) | 0.61 | 1.42 | 1637.0x / 705.0x | 🟢 WASM | 132.8% |
| ConstantSource (16 oscillators with LFO modulation) | 3.75 | 8.17 | 267.0x / 122.0x | 🟢 WASM | 117.9% |
| Analyser FFT Sizes (256) | 0.23 | 0.50 | 4332.0x / 2011.0x | 🟢 WASM | 117.4% |
| Channel Counts Comparison (4 Channels) | 0.36 | 0.73 | 2786.0x / 1379.0x | 🟢 WASM | 102.8% |
| Analyser FFT Sizes (4096) | 0.26 | 0.48 | 3893.0x / 2091.0x | 🟢 WASM | 84.6% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.83 | 2.99 | 547.0x / 335.0x | 🟢 WASM | 63.4% |
| AudioParam Automation (1000 events) | 0.27 | 0.44 | 0.8x / 2.1x | 🟢 WASM | 63.0% |
| Gain Ramping (20 crossfades) | 0.65 | 1.00 | 1539.0x / 996.0x | 🟢 WASM | 53.8% |
| Oscillators (16 oscillators, 4 waveform types) | 3.58 | 5.48 | 279.0x / 182.0x | 🟢 WASM | 53.1% |
| Channel Operations (split/process/merge) | 1.00 | 1.47 | 1004.0x / 682.0x | 🟢 WASM | 47.0% |
| Heavy Processing (Full mixing/mastering chain) | 12.88 | 18.30 | 78.0x / 55.0x | 🟢 WASM | 42.1% |
| Node Creation (150 nodes per iteration) | 3.09 | 4.34 | 48.5x / 34.6x | 🟢 WASM | 40.5% |
| Analyser (FFT with 2048 fftSize) | 1.64 | 2.23 | 610.0x / 448.0x | 🟢 WASM | 36.0% |
| Stereo Panner (16 sources across stereo field) | 4.84 | 6.50 | 207.0x / 154.0x | 🟢 WASM | 34.3% |
| Channel Counts Comparison (6 Channels) | 0.56 | 0.74 | 1780.0x / 1347.0x | 🟢 WASM | 32.1% |
| Filter Types (8 filter types) | 4.11 | 4.71 | 243.0x / 213.0x | 🟢 WASM | 14.6% |
| Buffer Playback (50 sound effects) | 5.47 | 6.23 | 183.0x / 160.0x | 🟢 WASM | 13.9% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.69 | 1.89 | 590.0x / 530.0x | 🟢 WASM | 11.8% |
| Envelope Generator (16 notes with ADSR) | 2.27 | 2.53 | 440.0x / 395.0x | 🟢 WASM | 11.5% |
| Channel Counts Comparison (8 Channels) | 0.70 | 0.77 | 1429.0x / 1301.0x | 🟢 WASM | 10.0% |
| Delay Node (1 second with feedback) | 0.65 | 0.71 | 1535.0x / 1406.0x | 🟢 WASM | 9.2% |
| Complex Graph (4 parallel chains) | 1.84 | 1.95 | 272.0x / 256.0x | 🟢 WASM | 6.0% |
| Stress Test (100 sources, 400 total nodes) | 61.10 | 64.33 | 16.0x / 16.0x | 🟢 WASM | 5.3% |
| Convolver (Reverb with 1s impulse response) | 198.29 | 36.22 | 5.0x / 28.0x | 🔴 Rust | 447.5% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 310.86 | 62.94 | 97.3x / 58.0x | 🔴 Rust | 393.9% |
| Granular Synthesis (100 grains) | 7.69 | 3.19 | 130.0x / 313.0x | 🔴 Rust | 141.1% |
| Offline Rendering (1 second of audio) | 0.80 | 0.68 | 1250.0x / 1479.0x | 🔴 Rust | 17.6% |
| Filter Chain (5 cascaded filters) | 1.78 | 1.59 | 563.0x / 631.0x | 🔴 Rust | 11.9% |
| IIR Filter (4 cascaded custom filters) | 3.17 | 2.93 | 315.0x / 341.0x | 🔴 Rust | 8.2% |
| Mixing Performance (100 simultaneous sources) | 6.36 | 6.34 | 7.5x / 7.6x | 🟡 Similar | 0.3% |

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
