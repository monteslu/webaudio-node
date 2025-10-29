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
  - **webaudio-node wins:** 50/60 (**83.3%**)
  - **node-web-audio-api wins:** 10/60 (16.7%)
  - **Similar performance (within 1%):** 0/60 (0.0%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 1911.2%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Panner Distance Models (Inverse) | 0.67 | 102.58 | 1496.0x / 10.0x | 🟢 WASM | 15210.4% |
| Panner Distance Models (Exponential) | 0.68 | 101.70 | 1476.0x / 10.0x | 🟢 WASM | 14855.9% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.70 | 103.70 | 1431.0x / 10.0x | 🟢 WASM | 14714.3% |
| Panner Distance Models (Linear) | 0.71 | 105.06 | 1403.0x / 10.0x | 🟢 WASM | 14697.2% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 0.24 | 23.67 | 4156.0x / 42.0x | 🟢 WASM | 9762.5% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 0.26 | 16.80 | 3842.0x / 60.0x | 🟢 WASM | 6361.5% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 0.23 | 13.32 | 4278.0x / 75.0x | 🟢 WASM | 5691.3% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 0.26 | 10.56 | 3838.0x / 95.0x | 🟢 WASM | 3961.5% |
| 3D Panner (8 sources with HRTF positioning) | 4.44 | 104.48 | 225.0x / 10.0x | 🟢 WASM | 2253.2% |
| WaveShaper Oversampling Levels (4x) | 0.36 | 7.57 | 2760.0x / 132.0x | 🟢 WASM | 2002.8% |
| WaveShaper Oversampling Levels (2x) | 0.36 | 4.94 | 2754.0x / 203.0x | 🟢 WASM | 1272.2% |
| WaveShaper Oversampling Levels (none) | 0.40 | 1.76 | 2473.0x / 568.0x | 🟢 WASM | 340.0% |
| Channel Counts Comparison (1 Channel) | 0.16 | 0.64 | 6405.0x / 1553.0x | 🟢 WASM | 300.0% |
| Sample Rates Comparison (22050 Hz) | 0.09 | 0.33 | 11512.0x / 3029.0x | 🟢 WASM | 266.7% |
| Channel Counts Comparison (2 Channels) | 0.19 | 0.68 | 5351.0x / 1480.0x | 🟢 WASM | 257.9% |
| Sample Rates Comparison (16000 Hz) | 0.07 | 0.25 | 14566.0x / 4030.0x | 🟢 WASM | 257.1% |
| Sample Rates Comparison (44100 Hz) | 0.18 | 0.61 | 5515.0x / 1644.0x | 🟢 WASM | 238.9% |
| Sample Rates Comparison (48000 Hz) | 0.21 | 0.64 | 4829.0x / 1573.0x | 🟢 WASM | 204.8% |
| Filter Modulation (4 oscillators with auto-wah) | 2.13 | 6.40 | 469.0x / 156.0x | 🟢 WASM | 200.5% |
| Analyser FFT Sizes (1024) | 0.17 | 0.49 | 5739.0x / 2055.0x | 🟢 WASM | 188.2% |
| Delay Modulation (4 sources with chorus effect) | 2.57 | 7.04 | 389.0x / 142.0x | 🟢 WASM | 173.9% |
| Analyser FFT Sizes (512) | 0.18 | 0.49 | 5700.0x / 2052.0x | 🟢 WASM | 172.2% |
| Multichannel (5.1 surround) | 1.63 | 4.27 | 613.0x / 234.0x | 🟢 WASM | 162.0% |
| Analyser FFT Sizes (16384) | 0.20 | 0.52 | 4901.0x / 1930.0x | 🟢 WASM | 160.0% |
| Ring Modulation (8 voices) | 2.53 | 6.45 | 396.0x / 155.0x | 🟢 WASM | 154.9% |
| Sample Rates Comparison (96000 Hz) | 0.50 | 1.27 | 1993.0x / 788.0x | 🟢 WASM | 154.0% |
| Analyser FFT Sizes (2048) | 0.19 | 0.48 | 5224.0x / 2105.0x | 🟢 WASM | 152.6% |
| Analyser FFT Sizes (8192) | 0.20 | 0.47 | 5098.0x / 2137.0x | 🟢 WASM | 135.0% |
| Analyser FFT Sizes (32768) | 0.20 | 0.47 | 4977.0x / 2122.0x | 🟢 WASM | 135.0% |
| ConstantSource (16 oscillators with LFO modulation) | 3.73 | 8.11 | 268.0x / 123.0x | 🟢 WASM | 117.4% |
| WaveShaper (1 second with 2x oversampling) | 0.58 | 1.26 | 1733.0x / 792.0x | 🟢 WASM | 117.2% |
| Channel Counts Comparison (4 Channels) | 0.34 | 0.72 | 2915.0x / 1389.0x | 🟢 WASM | 111.8% |
| Analyser FFT Sizes (256) | 0.23 | 0.48 | 4442.0x / 2078.0x | 🟢 WASM | 108.7% |
| Analyser FFT Sizes (4096) | 0.25 | 0.49 | 3968.0x / 2061.0x | 🟢 WASM | 96.0% |
| AudioParam Automation (1000 events) | 0.26 | 0.45 | 0.7x / 2.2x | 🟢 WASM | 73.1% |
| Sample Rates Comparison (8000 Hz) | 0.10 | 0.16 | 10327.0x / 6217.0x | 🟢 WASM | 60.0% |
| Channel Operations (split/process/merge) | 0.96 | 1.48 | 1041.0x / 674.0x | 🟢 WASM | 54.2% |
| Oscillators (16 oscillators, 4 waveform types) | 3.69 | 5.62 | 271.0x / 178.0x | 🟢 WASM | 52.3% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.94 | 2.90 | 516.0x / 344.0x | 🟢 WASM | 49.5% |
| Gain Ramping (20 crossfades) | 0.67 | 1.00 | 1495.0x / 1004.0x | 🟢 WASM | 49.3% |
| Delay Node (1 second with feedback) | 0.67 | 0.93 | 1484.0x / 1079.0x | 🟢 WASM | 38.8% |
| Heavy Processing (Full mixing/mastering chain) | 13.20 | 18.32 | 76.0x / 55.0x | 🟢 WASM | 38.8% |
| Node Creation (150 nodes per iteration) | 3.35 | 4.48 | 44.8x / 33.5x | 🟢 WASM | 33.7% |
| Stereo Panner (16 sources across stereo field) | 5.00 | 6.60 | 200.0x / 151.0x | 🟢 WASM | 32.0% |
| Analyser (FFT with 2048 fftSize) | 1.77 | 2.23 | 566.0x / 449.0x | 🟢 WASM | 26.0% |
| Channel Counts Comparison (6 Channels) | 0.63 | 0.74 | 1593.0x / 1359.0x | 🟢 WASM | 17.5% |
| Dynamics Compressor (4 sources with aggressive settings) | 1.66 | 1.94 | 602.0x / 515.0x | 🟢 WASM | 16.9% |
| Channel Counts Comparison (8 Channels) | 0.70 | 0.79 | 1438.0x / 1263.0x | 🟢 WASM | 12.9% |
| Filter Types (8 filter types) | 4.21 | 4.72 | 238.0x / 212.0x | 🟢 WASM | 12.1% |
| Envelope Generator (16 notes with ADSR) | 2.37 | 2.55 | 422.0x / 392.0x | 🟢 WASM | 7.6% |
| Convolver (Reverb with 1s impulse response) | 199.26 | 31.09 | 5.0x / 32.0x | 🔴 Rust | 540.9% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 299.96 | 96.56 | 96.1x / 59.0x | 🔴 Rust | 210.6% |
| Granular Synthesis (100 grains) | 8.59 | 3.20 | 116.0x / 313.0x | 🔴 Rust | 168.4% |
| Buffer Playback (50 sound effects) | 6.37 | 3.62 | 157.0x / 276.0x | 🔴 Rust | 76.0% |
| Mixing Performance (100 simultaneous sources) | 7.79 | 6.42 | 6.2x / 7.5x | 🔴 Rust | 21.3% |
| Offline Rendering (1 second of audio) | 0.79 | 0.69 | 1266.0x / 1454.0x | 🔴 Rust | 14.5% |
| Filter Chain (5 cascaded filters) | 1.75 | 1.56 | 571.0x / 640.0x | 🔴 Rust | 12.2% |
| IIR Filter (4 cascaded custom filters) | 3.17 | 2.98 | 316.0x / 335.0x | 🔴 Rust | 6.4% |
| Stress Test (100 sources, 400 total nodes) | 66.42 | 63.46 | 15.0x / 16.0x | 🔴 Rust | 4.7% |
| Complex Graph (4 parallel chains) | 2.03 | 1.94 | 247.0x / 258.0x | 🔴 Rust | 4.6% |

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
