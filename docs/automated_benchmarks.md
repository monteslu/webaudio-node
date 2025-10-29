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
  - **node-web-audio-api wins:** 7/60 (11.7%)
  - **Similar performance (within 1%):** 0/60 (0.0%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 1846.5%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Inverse) | 0.63 | 104.14 | 1581.0x / 10.0x | 🟢 WASM | 16430.2% |
| Panner Distance Models (Exponential) | 0.65 | 103.69 | 1532.0x / 10.0x | 🟢 WASM | 15852.3% |
| Panner Distance Models (Linear) | 0.68 | 103.85 | 1473.0x / 10.0x | 🟢 WASM | 15172.1% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.69 | 104.44 | 1454.0x / 10.0x | 🟢 WASM | 15036.2% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 0.25 | 24.49 | 4055.0x / 41.0x | 🟢 WASM | 9696.0% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 0.27 | 17.16 | 3746.0x / 58.0x | 🟢 WASM | 6255.6% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 0.27 | 13.56 | 3686.0x / 74.0x | 🟢 WASM | 4922.2% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 0.28 | 10.45 | 3583.0x / 96.0x | 🟢 WASM | 3632.1% |
| 3D Panner (8 sources with HRTF positioning) | 4.27 | 105.27 | 234.0x / 9.0x | 🟢 WASM | 2365.3% |
| WaveShaper Oversampling Levels (4x) | 0.36 | 7.57 | 2747.0x / 132.0x | 🟢 WASM | 2002.8% |
| WaveShaper Oversampling Levels (2x) | 0.39 | 4.91 | 2585.0x / 204.0x | 🟢 WASM | 1159.0% |
| WaveShaper Oversampling Levels (none) | 0.39 | 1.82 | 2577.0x / 548.0x | 🟢 WASM | 366.7% |
| Channel Counts Comparison (1 Channel) | 0.14 | 0.62 | 7298.0x / 1605.0x | 🟢 WASM | 342.9% |
| Sample Rates Comparison (44100 Hz) | 0.17 | 0.64 | 5799.0x / 1551.0x | 🟢 WASM | 276.5% |
| Channel Counts Comparison (2 Channels) | 0.18 | 0.67 | 5432.0x / 1496.0x | 🟢 WASM | 272.2% |
| Sample Rates Comparison (16000 Hz) | 0.07 | 0.26 | 15142.0x / 3843.0x | 🟢 WASM | 271.4% |
| Sample Rates Comparison (48000 Hz) | 0.19 | 0.67 | 5203.0x / 1501.0x | 🟢 WASM | 252.6% |
| Sample Rates Comparison (22050 Hz) | 0.10 | 0.35 | 10302.0x / 2892.0x | 🟢 WASM | 250.0% |
| Delay Modulation (4 sources with chorus effect) | 2.25 | 7.16 | 444.0x / 140.0x | 🟢 WASM | 218.2% |
| Filter Modulation (4 oscillators with auto-wah) | 2.01 | 6.37 | 498.0x / 157.0x | 🟢 WASM | 216.9% |
| Ring Modulation (8 voices) | 2.12 | 6.38 | 471.0x / 157.0x | 🟢 WASM | 200.9% |
| Sample Rates Comparison (96000 Hz) | 0.46 | 1.25 | 2163.0x / 802.0x | 🟢 WASM | 171.7% |
| Analyser FFT Sizes (512) | 0.18 | 0.48 | 5593.0x / 2100.0x | 🟢 WASM | 166.7% |
| Analyser FFT Sizes (2048) | 0.18 | 0.48 | 5463.0x / 2105.0x | 🟢 WASM | 166.7% |
| Analyser FFT Sizes (16384) | 0.18 | 0.48 | 5674.0x / 2068.0x | 🟢 WASM | 166.7% |
| Analyser FFT Sizes (32768) | 0.18 | 0.48 | 5549.0x / 2085.0x | 🟢 WASM | 166.7% |
| Analyser FFT Sizes (8192) | 0.18 | 0.47 | 5567.0x / 2110.0x | 🟢 WASM | 161.1% |
| Multichannel (5.1 surround) | 1.64 | 4.25 | 611.0x / 235.0x | 🟢 WASM | 159.1% |
| Analyser FFT Sizes (1024) | 0.19 | 0.47 | 5338.0x / 2108.0x | 🟢 WASM | 147.4% |
| ConstantSource (16 oscillators with LFO modulation) | 3.54 | 8.27 | 282.0x / 121.0x | 🟢 WASM | 133.6% |
| Analyser FFT Sizes (256) | 0.21 | 0.48 | 4775.0x / 2091.0x | 🟢 WASM | 128.6% |
| WaveShaper (1 second with 2x oversampling) | 0.58 | 1.25 | 1733.0x / 797.0x | 🟢 WASM | 115.5% |
| Channel Counts Comparison (4 Channels) | 0.36 | 0.71 | 2743.0x / 1402.0x | 🟢 WASM | 97.2% |
| Analyser FFT Sizes (4096) | 0.26 | 0.48 | 3902.0x / 2082.0x | 🟢 WASM | 84.6% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.75 | 3.12 | 571.0x / 320.0x | 🟢 WASM | 78.3% |
| Stereo Panner (16 sources across stereo field) | 4.38 | 7.56 | 228.0x / 132.0x | 🟢 WASM | 72.6% |
| AudioParam Automation (1000 events) | 0.27 | 0.46 | 0.7x / 2.1x | 🟢 WASM | 70.4% |
| Oscillators (16 oscillators, 4 waveform types) | 3.38 | 5.63 | 296.0x / 178.0x | 🟢 WASM | 66.6% |
| Channel Counts Comparison (8 Channels) | 0.74 | 1.14 | 1356.0x / 880.0x | 🟢 WASM | 54.1% |
| Gain Ramping (20 crossfades) | 0.65 | 1.00 | 1534.0x / 1001.0x | 🟢 WASM | 53.8% |
| Sample Rates Comparison (8000 Hz) | 0.12 | 0.18 | 8535.0x / 5410.0x | 🟢 WASM | 50.0% |
| Node Creation (150 nodes per iteration) | 3.19 | 4.70 | 47.1x / 31.9x | 🟢 WASM | 47.3% |
| Analyser (FFT with 2048 fftSize) | 1.59 | 2.27 | 628.0x / 440.0x | 🟢 WASM | 42.8% |
| Heavy Processing (Full mixing/mastering chain) | 12.86 | 18.12 | 78.0x / 55.0x | 🟢 WASM | 40.9% |
| Delay Node (1 second with feedback) | 0.64 | 0.89 | 1562.0x / 1118.0x | 🟢 WASM | 39.1% |
| Channel Operations (split/process/merge) | 0.97 | 1.30 | 1034.0x / 770.0x | 🟢 WASM | 34.0% |
| Channel Counts Comparison (6 Channels) | 0.56 | 0.75 | 1790.0x / 1328.0x | 🟢 WASM | 33.9% |
| Mixing Performance (100 simultaneous sources) | 4.96 | 6.53 | 9.7x / 7.3x | 🟢 WASM | 31.7% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.66 | 2.00 | 603.0x / 499.0x | 🟢 WASM | 20.5% |
| Envelope Generator (16 notes with ADSR) | 2.09 | 2.51 | 478.0x / 398.0x | 🟢 WASM | 20.1% |
| Filter Types (8 filter types) | 3.97 | 4.73 | 252.0x / 211.0x | 🟢 WASM | 19.1% |
| Stress Test (100 sources, 400 total nodes) | 54.47 | 64.38 | 18.0x / 16.0x | 🟢 WASM | 18.2% |
| Complex Graph (4 parallel chains) | 1.73 | 1.97 | 289.0x / 254.0x | 🟢 WASM | 13.9% |
| Convolver (Reverb with 1s impulse response) | 202.75 | 38.95 | 5.0x / 26.0x | 🔴 Rust | 420.5% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 312.11 | 60.59 | 96.9x / 57.7x | 🔴 Rust | 415.1% |
| Granular Synthesis (100 grains) | 6.40 | 3.35 | 156.0x / 298.0x | 🔴 Rust | 91.0% |
| Buffer Playback (50 sound effects) | 4.80 | 3.63 | 208.0x / 275.0x | 🔴 Rust | 32.2% |
| Filter Chain (5 cascaded filters) | 1.77 | 1.55 | 564.0x / 644.0x | 🔴 Rust | 14.2% |
| Offline Rendering (1 second of audio) | 0.76 | 0.68 | 1323.0x / 1478.0x | 🔴 Rust | 11.8% |
| IIR Filter (4 cascaded custom filters) | 3.25 | 3.02 | 308.0x / 331.0x | 🔴 Rust | 7.6% |

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
