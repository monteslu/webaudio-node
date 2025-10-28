# Automated Benchmark Results

> **Last Updated:** 2025-10-28
> **Platform:** linux (x64)
> **CPU:** AMD Ryzen AI 9 HX 370 w/ Radeon 890M
> **Node.js:** v22.14.0

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** 61
- **Successful Comparisons:** 0 (both implementations completed)
  - **webaudio-node wins:** 0/0 (**NaN%**)
  - **node-web-audio-api wins:** 0/0 (NaN%)
  - **Similar performance (within 1%):** 0/0 (NaN%)
- **Failed Benchmarks:** 61
  - **webaudio-node failed:** 0
  - **node-web-audio-api failed:** 61
  - **Both failed:** 0
- **Average Speedup (when webaudio-node faster):** 0.0%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
| Offline Rendering (1 second of audio) | 0.59 | FAILED | 1702.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Mixing Performance (100 simultaneous sources) | 5.05 | FAILED | 9.5x / N/A | ❌ node-web-audio-api FAILED | N/A |
| AudioParam Automation (1000 events) | 0.26 | FAILED | 2.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 398.50 | FAILED | 87.5x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Delay Node (1 second with feedback) | 1.68 | FAILED | 594.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper (1 second with 2x oversampling) | 2.02 | FAILED | 494.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Complex Graph (4 parallel chains) | 0.76 | FAILED | 654.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Filter Chain (5 cascaded filters) | 1.75 | FAILED | 572.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Operations (split/process/merge) | 1.26 | FAILED | 795.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Node Creation (150 nodes per iteration) | 6.88 | FAILED | 21.8x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver (Reverb with 1s impulse response) | 1281.16 | FAILED | 1.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Dynamics Compressor (4 sources with aggressive settings) | 1.86 | FAILED | 537.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Stereo Panner (16 sources across stereo field) | 3.84 | FAILED | 260.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Buffer Playback (50 sound effects) | 5.11 | FAILED | 196.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser (FFT with 2048 fftSize) | 1.06 | FAILED | 943.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Oscillators (16 oscillators, 4 waveform types) | 2.85 | FAILED | 351.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| IIR Filter (4 cascaded custom filters) | 3.18 | FAILED | 315.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| 3D Panner (8 sources with HRTF positioning) | 3.38 | FAILED | 296.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Heavy Processing (Full mixing/mastering chain) | 6.55 | FAILED | 153.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Stress Test (100 sources, 400 total nodes) | 43.81 | FAILED | 23.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| ConstantSource (16 oscillators with LFO modulation) | 2.87 | FAILED | 348.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Gain Ramping (20 crossfades) | 0.87 | FAILED | 1155.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| PeriodicWave (8 custom waveforms, 32 harmonics) | 1.69 | FAILED | 593.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Delay Modulation (4 sources with chorus effect) | 1.33 | FAILED | 751.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Filter Modulation (4 oscillators with auto-wah) | 2.08 | FAILED | 482.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Envelope Generator (16 notes with ADSR) | 1.72 | FAILED | 583.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Ring Modulation (8 voices) | 2.04 | FAILED | 490.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Granular Synthesis (100 grains) | 6.38 | FAILED | 157.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Filter Types (8 filter types) | 3.28 | FAILED | 305.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Multichannel (5.1 surround) | 7.98 | FAILED | 125.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (8000 Hz) | 0.15 | FAILED | 6877.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (16000 Hz) | 0.33 | FAILED | 3057.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (22050 Hz) | 0.42 | FAILED | 2371.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (44100 Hz) | 0.84 | FAILED | 1184.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (48000 Hz) | 0.89 | FAILED | 1119.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (96000 Hz) | 1.74 | FAILED | 576.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (1 Channel) | 0.66 | FAILED | 1517.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (2 Channels) | 0.88 | FAILED | 1141.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (4 Channels) | 1.67 | FAILED | 599.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (6 Channels) | 2.50 | FAILED | 400.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (8 Channels) | 3.51 | FAILED | 285.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| AudioListener (8 sources, 50 position/orientation changes) | 3.42 | FAILED | 292.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Panner Distance Models (Linear) | 3.52 | FAILED | 284.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Panner Distance Models (Inverse) | 3.24 | FAILED | 309.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Panner Distance Models (Exponential) | 3.21 | FAILED | 311.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper Oversampling Levels (none) | 2.72 | FAILED | 368.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper Oversampling Levels (2x) | 2.09 | FAILED | 479.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper Oversampling Levels (4x) | 2.06 | FAILED | 485.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (256) | 1.23 | FAILED | 814.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (512) | 0.85 | FAILED | 1180.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (1024) | 0.84 | FAILED | 1196.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (2048) | 0.83 | FAILED | 1198.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (4096) | 0.83 | FAILED | 1204.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (8192) | 0.83 | FAILED | 1209.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (16384) | 0.82 | FAILED | 1215.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (32768) | 0.83 | FAILED | 1206.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | 245.99 | FAILED | 4.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | 1183.40 | FAILED | 1.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (1s (48000 samples)) | 2571.13 | FAILED | 0.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (2s (96000 samples)) | 5426.57 | FAILED | 0.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (4s (192000 samples)) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |

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
