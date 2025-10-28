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
| Offline Rendering (1 second of audio) | 0.58 | FAILED | 1720.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Mixing Performance (100 simultaneous sources) | 5.95 | FAILED | 8.1x / N/A | ❌ node-web-audio-api FAILED | N/A |
| AudioParam Automation (1000 events) | 0.20 | FAILED | 1.6x / N/A | ❌ node-web-audio-api FAILED | N/A |
| MP3 Processing (decode + gain, no filters due to webaudio-node bug) | 390.97 | FAILED | 87.1x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Delay Node (1 second with feedback) | 2.10 | FAILED | 475.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper (1 second with 2x oversampling) | 1.90 | FAILED | 528.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Complex Graph (4 parallel chains) | 1.81 | FAILED | 277.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Filter Chain (5 cascaded filters) | 1.73 | FAILED | 579.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Operations (split/process/merge) | 1.25 | FAILED | 802.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Node Creation (150 nodes per iteration) | 6.99 | FAILED | 21.5x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver (Reverb with 1s impulse response) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Dynamics Compressor (4 sources with aggressive settings) | 1.95 | FAILED | 512.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Stereo Panner (16 sources across stereo field) | 4.06 | FAILED | 246.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Buffer Playback (50 sound effects) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser (FFT with 2048 fftSize) | 1.90 | FAILED | 526.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Oscillators (16 oscillators, 4 waveform types) | 3.08 | FAILED | 324.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| IIR Filter (4 cascaded custom filters) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| 3D Panner (8 sources with HRTF positioning) | 3.53 | FAILED | 283.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Heavy Processing (Full mixing/mastering chain) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Stress Test (100 sources, 400 total nodes) | 45.66 | FAILED | 22.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| ConstantSource (16 oscillators with LFO modulation) | 3.44 | FAILED | 291.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Gain Ramping (20 crossfades) | 1.05 | FAILED | 953.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| PeriodicWave (8 custom waveforms, 32 harmonics) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Delay Modulation (4 sources with chorus effect) | 3.34 | FAILED | 300.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Filter Modulation (4 oscillators with auto-wah) | 1.96 | FAILED | 510.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Envelope Generator (16 notes with ADSR) | 2.04 | FAILED | 491.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Ring Modulation (8 voices) | 2.41 | FAILED | 415.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Granular Synthesis (100 grains) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Filter Types (8 filter types) | 3.27 | FAILED | 306.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Multichannel (5.1 surround) | 8.39 | FAILED | 119.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (8000 Hz) | 0.30 | FAILED | 3376.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (16000 Hz) | 0.34 | FAILED | 2945.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (22050 Hz) | 0.41 | FAILED | 2441.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (44100 Hz) | 0.81 | FAILED | 1234.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (48000 Hz) | 0.89 | FAILED | 1124.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Sample Rates Comparison (96000 Hz) | 1.80 | FAILED | 554.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (1 Channel) | 0.69 | FAILED | 1441.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (2 Channels) | 0.88 | FAILED | 1133.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (4 Channels) | 1.70 | FAILED | 588.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (6 Channels) | 2.54 | FAILED | 394.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Channel Counts Comparison (8 Channels) | 3.52 | FAILED | 284.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| AudioListener (8 sources, 50 position/orientation changes) | 3.53 | FAILED | 283.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Panner Distance Models (Linear) | 3.54 | FAILED | 282.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Panner Distance Models (Inverse) | 3.41 | FAILED | 293.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Panner Distance Models (Exponential) | 3.39 | FAILED | 295.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper Oversampling Levels (none) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper Oversampling Levels (2x) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| WaveShaper Oversampling Levels (4x) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (256) | 0.86 | FAILED | 1166.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (512) | 0.85 | FAILED | 1183.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (1024) | 0.84 | FAILED | 1184.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (2048) | 0.85 | FAILED | 1170.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (4096) | 0.86 | FAILED | 1168.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (8192) | 0.86 | FAILED | 1163.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (16384) | 0.91 | FAILED | 1095.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Analyser FFT Sizes (32768) | 0.85 | FAILED | 1177.0x / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (0.1s (4800 samples)) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (0.5s (24000 samples)) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (1s (48000 samples)) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
| Convolver Impulse Response Sizes (2s (96000 samples)) | FAILED | FAILED | N/A / N/A | ❌ node-web-audio-api FAILED | N/A |
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
