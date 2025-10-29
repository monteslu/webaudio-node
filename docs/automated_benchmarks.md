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
  - **webaudio-node wins:** 55/60 (**91.7%**)
  - **node-web-audio-api wins:** 5/60 (8.3%)
  - **Similar performance (within 1%):** 0/60 (0.0%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 1840.1%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| AudioListener (8 sources, 50 position/orientation changes) | 0.63 | 106.14 | 1588.0x / 9.0x | 🟢 WASM | 16747.6% |
| Panner Distance Models (Exponential) | 0.68 | 106.43 | 1481.0x / 9.0x | 🟢 WASM | 15551.5% |
| Panner Distance Models (Linear) | 0.68 | 106.15 | 1467.0x / 9.0x | 🟢 WASM | 15510.3% |
| Panner Distance Models (Inverse) | 0.67 | 103.75 | 1494.0x / 10.0x | 🟢 WASM | 15385.1% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 0.25 | 24.45 | 3927.0x / 41.0x | 🟢 WASM | 9680.0% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 0.26 | 17.05 | 3896.0x / 59.0x | 🟢 WASM | 6457.7% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 0.27 | 13.58 | 3686.0x / 74.0x | 🟢 WASM | 4929.6% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 0.25 | 10.59 | 4076.0x / 94.0x | 🟢 WASM | 4136.0% |
| 3D Panner (8 sources with HRTF positioning) | 4.23 | 105.12 | 236.0x / 10.0x | 🟢 WASM | 2385.1% |
| WaveShaper Oversampling Levels (4x) | 0.37 | 7.63 | 2718.0x / 131.0x | 🟢 WASM | 1962.2% |
| Analyser FFT Sizes (512) | 0.17 | 2.82 | 5734.0x / 354.0x | 🟢 WASM | 1558.8% |
| WaveShaper Oversampling Levels (2x) | 0.38 | 5.01 | 2614.0x / 199.0x | 🟢 WASM | 1218.4% |
| Sample Rates Comparison (8000 Hz) | 0.09 | 0.49 | 10622.0x / 2043.0x | 🟢 WASM | 444.4% |
| Channel Counts Comparison (1 Channel) | 0.14 | 0.66 | 6951.0x / 1508.0x | 🟢 WASM | 371.4% |
| WaveShaper Oversampling Levels (none) | 0.40 | 1.83 | 2513.0x / 545.0x | 🟢 WASM | 357.5% |
| Sample Rates Comparison (22050 Hz) | 0.08 | 0.34 | 11826.0x / 2979.0x | 🟢 WASM | 325.0% |
| Sample Rates Comparison (16000 Hz) | 0.07 | 0.26 | 14345.0x / 3842.0x | 🟢 WASM | 271.4% |
| Sample Rates Comparison (48000 Hz) | 0.19 | 0.66 | 5165.0x / 1518.0x | 🟢 WASM | 247.4% |
| Channel Counts Comparison (2 Channels) | 0.19 | 0.65 | 5238.0x / 1529.0x | 🟢 WASM | 242.1% |
| Sample Rates Comparison (44100 Hz) | 0.18 | 0.61 | 5693.0x / 1629.0x | 🟢 WASM | 238.9% |
| Delay Modulation (4 sources with chorus effect) | 2.29 | 7.25 | 437.0x / 138.0x | 🟢 WASM | 216.6% |
| Filter Modulation (4 oscillators with auto-wah) | 2.06 | 6.38 | 485.0x / 157.0x | 🟢 WASM | 209.7% |
| Ring Modulation (8 voices) | 2.15 | 6.42 | 465.0x / 156.0x | 🟢 WASM | 198.6% |
| Sample Rates Comparison (96000 Hz) | 0.45 | 1.25 | 2216.0x / 797.0x | 🟢 WASM | 177.8% |
| Analyser FFT Sizes (16384) | 0.18 | 0.50 | 5482.0x / 2019.0x | 🟢 WASM | 177.8% |
| Analyser FFT Sizes (32768) | 0.18 | 0.50 | 5425.0x / 1982.0x | 🟢 WASM | 177.8% |
| Analyser FFT Sizes (8192) | 0.18 | 0.49 | 5515.0x / 2057.0x | 🟢 WASM | 172.2% |
| Multichannel (5.1 surround) | 1.63 | 4.35 | 613.0x / 230.0x | 🟢 WASM | 166.9% |
| Analyser FFT Sizes (1024) | 0.18 | 0.48 | 5706.0x / 2067.0x | 🟢 WASM | 166.7% |
| Analyser FFT Sizes (2048) | 0.20 | 0.49 | 5112.0x / 2060.0x | 🟢 WASM | 145.0% |
| Analyser FFT Sizes (256) | 0.21 | 0.50 | 4678.0x / 2011.0x | 🟢 WASM | 138.1% |
| WaveShaper (1 second with 2x oversampling) | 0.54 | 1.26 | 1869.0x / 795.0x | 🟢 WASM | 133.3% |
| ConstantSource (16 oscillators with LFO modulation) | 3.64 | 8.23 | 275.0x / 122.0x | 🟢 WASM | 126.1% |
| Channel Counts Comparison (4 Channels) | 0.36 | 0.73 | 2779.0x / 1367.0x | 🟢 WASM | 102.8% |
| Analyser FFT Sizes (4096) | 0.28 | 0.50 | 3604.0x / 2013.0x | 🟢 WASM | 78.6% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.76 | 3.04 | 568.0x / 329.0x | 🟢 WASM | 72.7% |
| AudioParam Automation (1000 events) | 0.26 | 0.44 | 0.7x / 2.4x | 🟢 WASM | 69.2% |
| Oscillators (16 oscillators, 4 waveform types) | 3.38 | 5.69 | 296.0x / 176.0x | 🟢 WASM | 68.3% |
| Gain Ramping (20 crossfades) | 0.66 | 1.03 | 1519.0x / 967.0x | 🟢 WASM | 56.1% |
| Analyser (FFT with 2048 fftSize) | 1.49 | 2.30 | 670.0x / 436.0x | 🟢 WASM | 54.4% |
| Channel Counts Comparison (6 Channels) | 0.51 | 0.78 | 1968.0x / 1284.0x | 🟢 WASM | 52.9% |
| Stereo Panner (16 sources across stereo field) | 4.40 | 6.69 | 227.0x / 149.0x | 🟢 WASM | 52.0% |
| Channel Operations (split/process/merge) | 1.00 | 1.48 | 1005.0x / 675.0x | 🟢 WASM | 48.0% |
| Node Creation (150 nodes per iteration) | 3.21 | 4.60 | 46.8x / 32.6x | 🟢 WASM | 43.3% |
| Heavy Processing (Full mixing/mastering chain) | 12.87 | 18.39 | 78.0x / 54.0x | 🟢 WASM | 42.9% |
| Mixing Performance (100 simultaneous sources) | 4.75 | 6.49 | 10.1x / 7.4x | 🟢 WASM | 36.6% |
| IIR Filter (4 cascaded custom filters) | 2.23 | 3.00 | 449.0x / 333.0x | 🟢 WASM | 34.5% |
| Buffer Playback (50 sound effects) | 4.85 | 6.51 | 206.0x / 154.0x | 🟢 WASM | 34.2% |
| Delay Node (1 second with feedback) | 0.67 | 0.87 | 1494.0x / 1145.0x | 🟢 WASM | 29.9% |
| Envelope Generator (16 notes with ADSR) | 2.15 | 2.59 | 465.0x / 386.0x | 🟢 WASM | 20.5% |
| Channel Counts Comparison (8 Channels) | 0.69 | 0.83 | 1456.0x / 1206.0x | 🟢 WASM | 20.3% |
| Filter Types (8 filter types) | 4.02 | 4.80 | 249.0x / 208.0x | 🟢 WASM | 19.4% |
| Stress Test (100 sources, 400 total nodes) | 55.01 | 65.07 | 18.0x / 15.0x | 🟢 WASM | 18.3% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.70 | 1.94 | 588.0x / 515.0x | 🟢 WASM | 14.1% |
| Complex Graph (4 parallel chains) | 1.82 | 2.00 | 275.0x / 251.0x | 🟢 WASM | 9.9% |
| Convolver (Reverb with 1s impulse response) | 200.74 | 35.83 | 5.0x / 28.0x | 🔴 Rust | 460.3% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 312.45 | 64.74 | 98.0x / 58.6x | 🔴 Rust | 382.6% |
| Granular Synthesis (100 grains) | 6.55 | 3.18 | 153.0x / 314.0x | 🔴 Rust | 106.0% |
| Filter Chain (5 cascaded filters) | 1.81 | 1.57 | 552.0x / 636.0x | 🔴 Rust | 15.3% |
| Offline Rendering (1 second of audio) | 0.72 | 0.70 | 1395.0x / 1425.0x | 🔴 Rust | 2.9% |

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
