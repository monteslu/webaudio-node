# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 61
- **Successful Comparisons:** 61 (both implementations completed)
  - **webaudio-node wins:** 43/61 (**70.5%**)
  - **node-web-audio-api wins:** 17/61 (27.9%)
  - **Similar performance (within 1%):** 1/61 (1.6%)
- **Failed Benchmarks:** 0
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 0
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 1714.0%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Stress Test (100 sources, 400 total nodes) | 0.83 | 57.45 | 1207.0x / 17.0x | 🟢 WASM | 6821.7% |
| Panner Distance Models (Exponential) | 0.52 | 35.87 | 1923.0x / 28.0x | 🟢 WASM | 6798.1% |
| Panner Distance Models (Inverse) | 0.53 | 36.05 | 1880.0x / 28.0x | 🟢 WASM | 6701.9% |
| Convolver (Reverb with 1s impulse response) | 1.15 | 69.99 | 872.0x / 14.0x | 🟢 WASM | 5986.1% |
| 3D Panner (8 sources with HRTF positioning) | 0.64 | 38.72 | 1560.0x / 26.0x | 🟢 WASM | 5950.0% |
| Node Creation (150 nodes per iteration) | 0.10 | 5.84 | 1480.3x / 25.7x | 🟢 WASM | 5740.0% |
| Panner Distance Models (Linear) | 0.69 | 36.77 | 1455.0x / 27.0x | 🟢 WASM | 5229.0% |
| Convolver Impulse Response Sizes (4s (192000 samples)) | 0.95 | 46.98 | 1055.0x / 21.0x | 🟢 WASM | 4845.3% |
| AudioListener (8 sources, 50 position/orientation changes) | 0.79 | 36.84 | 1267.0x / 27.0x | 🟢 WASM | 4563.3% |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 0.57 | 19.78 | 1744.0x / 51.0x | 🟢 WASM | 3370.2% |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 0.51 | 13.20 | 1960.0x / 76.0x | 🟢 WASM | 2488.2% |
| Heavy Processing (Full mixing/mastering chain) | 0.74 | 16.80 | 1350.0x / 60.0x | 🟢 WASM | 2170.3% |
| WaveShaper Oversampling Levels (4x) | 0.52 | 5.95 | 1908.0x / 168.0x | 🟢 WASM | 1044.2% |
| ConstantSource (16 oscillators with LFO modulation) | 0.70 | 7.88 | 1424.0x / 127.0x | 🟢 WASM | 1025.7% |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 0.84 | 9.40 | 1184.0x / 106.0x | 🟢 WASM | 1019.0% |
| Filter Modulation (4 oscillators with auto-wah) | 0.75 | 7.92 | 1341.0x / 126.0x | 🟢 WASM | 956.0% |
| Stereo Panner (16 sources across stereo field) | 0.68 | 6.94 | 1465.0x / 144.0x | 🟢 WASM | 920.6% |
| Mixing Performance (100 simultaneous sources) | 0.54 | 5.22 | 89.3x / 9.2x | 🟢 WASM | 866.7% |
| Delay Modulation (4 sources with chorus effect) | 0.61 | 5.69 | 1627.0x / 176.0x | 🟢 WASM | 832.8% |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 0.79 | 6.59 | 1273.0x / 152.0x | 🟢 WASM | 734.2% |
| Ring Modulation (8 voices) | 0.71 | 5.58 | 1405.0x / 179.0x | 🟢 WASM | 685.9% |
| Oscillators (16 oscillators, 4 waveform types) | 0.65 | 4.76 | 1546.0x / 210.0x | 🟢 WASM | 632.3% |
| Filter Types (8 filter types) | 0.71 | 4.15 | 1409.0x / 241.0x | 🟢 WASM | 484.5% |
| Granular Synthesis (100 grains) | 0.68 | 3.86 | 1480.0x / 259.0x | 🟢 WASM | 467.6% |
| WaveShaper Oversampling Levels (2x) | 0.74 | 3.85 | 1360.0x / 259.0x | 🟢 WASM | 420.3% |
| Dynamics Compressor (4 sources with aggressive settings) | 0.55 | 2.39 | 1834.0x / 418.0x | 🟢 WASM | 334.5% |
| Offline Rendering (1 second of audio) | 0.22 | 0.93 | 4542.0x / 1078.0x | 🟢 WASM | 322.7% |
| Buffer Playback (50 sound effects) | 0.78 | 3.28 | 1282.0x / 305.0x | 🟢 WASM | 320.5% |
| Envelope Generator (16 notes with ADSR) | 0.69 | 2.90 | 1448.0x / 344.0x | 🟢 WASM | 320.3% |
| IIR Filter (4 cascaded custom filters) | 0.70 | 2.89 | 1423.0x / 346.0x | 🟢 WASM | 312.9% |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 0.94 | 3.86 | 1069.0x / 259.0x | 🟢 WASM | 310.6% |
| Analyser (FFT with 2048 fftSize) | 0.66 | 2.46 | 1524.0x / 406.0x | 🟢 WASM | 272.7% |
| WaveShaper Oversampling Levels (none) | 0.78 | 2.27 | 1281.0x / 441.0x | 🟢 WASM | 191.0% |
| Filter Chain (5 cascaded filters) | 0.63 | 1.38 | 1583.0x / 725.0x | 🟢 WASM | 119.0% |
| Multichannel (5.1 surround) | 1.99 | 4.01 | 503.0x / 249.0x | 🟢 WASM | 101.5% |
| Complex Graph (4 parallel chains) | 0.92 | 1.67 | 542.0x / 299.0x | 🟢 WASM | 81.5% |
| Channel Operations (split/process/merge) | 0.66 | 1.17 | 1505.0x / 853.0x | 🟢 WASM | 77.3% |
| Gain Ramping (20 crossfades) | 0.73 | 1.22 | 1370.0x / 819.0x | 🟢 WASM | 67.1% |
| AudioParam Automation (1000 events) | 0.32 | 0.45 | 1.6x / 2.4x | 🟢 WASM | 40.6% |
| Channel Counts Comparison (1 Channel) | 0.42 | 0.55 | 2375.0x / 1828.0x | 🟢 WASM | 31.0% |
| Sample Rates Comparison (48000 Hz) | 0.56 | 0.68 | 1794.0x / 1471.0x | 🟢 WASM | 21.4% |
| Sample Rates Comparison (44100 Hz) | 0.56 | 0.64 | 1794.0x / 1564.0x | 🟢 WASM | 14.3% |
| Sample Rates Comparison (96000 Hz) | 1.05 | 1.15 | 957.0x / 870.0x | 🟢 WASM | 9.5% |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 394.80 | 89.87 | 19.3x / 71.8x | 🔴 Rust | 339.3% |
| Channel Counts Comparison (6 Channels) | 1.61 | 0.71 | 623.0x / 1404.0x | 🔴 Rust | 126.8% |
| Channel Counts Comparison (4 Channels) | 1.12 | 0.63 | 895.0x / 1580.0x | 🔴 Rust | 77.8% |
| Channel Counts Comparison (8 Channels) | 2.12 | 1.25 | 471.0x / 799.0x | 🔴 Rust | 69.6% |
| Analyser FFT Sizes (256) | 0.67 | 0.45 | 1502.0x / 2239.0x | 🔴 Rust | 48.9% |
| Sample Rates Comparison (8000 Hz) | 0.23 | 0.16 | 4437.0x / 6436.0x | 🔴 Rust | 43.8% |
| Analyser FFT Sizes (32768) | 0.57 | 0.44 | 1754.0x / 2281.0x | 🔴 Rust | 29.5% |
| Analyser FFT Sizes (512) | 0.54 | 0.44 | 1849.0x / 2259.0x | 🔴 Rust | 22.7% |
| Delay Node (1 second with feedback) | 1.21 | 0.99 | 824.0x / 1011.0x | 🔴 Rust | 22.2% |
| Analyser FFT Sizes (4096) | 0.52 | 0.44 | 1926.0x / 2287.0x | 🔴 Rust | 18.2% |
| Analyser FFT Sizes (16384) | 0.52 | 0.44 | 1940.0x / 2293.0x | 🔴 Rust | 18.2% |
| Sample Rates Comparison (22050 Hz) | 0.35 | 0.30 | 2826.0x / 3349.0x | 🔴 Rust | 16.7% |
| WaveShaper (1 second with 2x oversampling) | 1.31 | 1.13 | 764.0x / 886.0x | 🔴 Rust | 15.9% |
| Analyser FFT Sizes (8192) | 0.51 | 0.44 | 1946.0x / 2251.0x | 🔴 Rust | 15.9% |
| Analyser FFT Sizes (1024) | 0.52 | 0.45 | 1938.0x / 2246.0x | 🔴 Rust | 15.6% |
| Analyser FFT Sizes (2048) | 0.51 | 0.45 | 1942.0x / 2217.0x | 🔴 Rust | 13.3% |
| Channel Counts Comparison (2 Channels) | 0.66 | 0.59 | 1512.0x / 1696.0x | 🔴 Rust | 11.9% |
| Sample Rates Comparison (16000 Hz) | 0.22 | 0.22 | 4459.0x / 4505.0x | 🟡 Similar | 0.0% |

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
