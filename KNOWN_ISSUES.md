# Known Issues

## Recently Fixed (October 2025)

### ✅ FIXED: Gain Node Input Mixing Bug

**Status**: FIXED in October 2025
**Severity**: Was Critical - now resolved

Gain nodes were previously only processing their first input connection. This has been fixed - gain nodes now properly mix ALL connected inputs together, matching the Web Audio API specification. All audio sources connected to a gain node now contribute to the output correctly.

## Current Issues

### Performance: Multi-channel Processing (4ch/6ch/8ch)

**Status**: Known limitation
**Severity**: Low (affects advanced use cases)
**Affects**: Contexts with more than 2 channels

Processing nodes with 4, 6, or 8 channels can be 30-64% slower than the Rust-based node-web-audio-api implementation. This is due to architectural differences in how multi-channel audio is vectorized.

**Workaround**: Most applications use stereo (2 channels) and are unaffected. For multi-channel applications, performance is still acceptable but not optimal.

**Status**: This is an architectural limitation and would require significant refactoring to address.

### Performance: Analyser Node Process() Overhead

**Status**: Known limitation
**Severity**: Low (does not affect actual FFT performance)

The AnalyserNode has 14-19% overhead when writing samples to its circular buffer due to mutex synchronization. However, this does not affect actual FFT performance - benchmarks show we are 64-77% faster than competition on real FFT workloads (Convolver).

**Note**: This only affects the overhead of routing audio through an AnalyserNode, not the actual analysis operations like `getFloatFrequencyData()`.

### Decoding: MP3 Processing Performance

**Status**: Known limitation
**Severity**: Low (decoding is still fast, just not as optimized as alternatives)

MP3 decoding is currently 2-3x slower than highly optimized alternatives. However, most audio files decode in tens of milliseconds, which is acceptable for most use cases.

**Status**: Low priority - focus is on real-time audio processing performance rather than decoding optimization.
