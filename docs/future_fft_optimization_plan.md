# FFT Optimization Plan

## Current Status

The current FFT implementation (`src/native/utils/fft.cpp`) is **correct and functional** but not optimized for performance.

**Current characteristics:**
- ✅ Cooley-Tukey radix-2 algorithm (O(n log n))
- ✅ Pre-computed twiddle factors
- ✅ Produces correct results matching Chrome
- ❌ No SIMD vectorization
- ❌ Uses `std::complex<float>` (overhead)
- ❌ Not cache-optimized
- ❌ Computes `std::log2()` in hot loop

**Performance estimate:**
- Current: ~100-200 microseconds for 2048-point FFT
- Optimized: ~10-20 microseconds (10x improvement possible)

## Optimization Options

### Option 1: Optimize Current Implementation (Low Effort)

Quick wins without external dependencies:

1. **Remove `std::log2()` from hot path** (line 65)
   ```cpp
   // Pre-compute log2(size_) in constructor
   int log2_size_ = 0;
   int temp = size_;
   while (temp > 1) { temp >>= 1; log2_size_++; }

   // Use in Forward()
   for (int stage = 1; stage <= log2_size_; ++stage)
   ```

2. **Replace `std::complex<float>` with manual struct**
   ```cpp
   struct Complex { float re, im; };
   // Manually implement butterfly operations
   ```

3. **Add SIMD hints/alignment**
   ```cpp
   alignas(32) std::vector<Complex> twiddle_factors_;
   ```

**Expected improvement:** 2-3x faster (~50-70 microseconds)

### Option 2: Integrate PFFFT (Recommended)

**Why PFFFT:**
- Permissive license (BSD-like)
- Highly optimized (SIMD: SSE, NEON)
- Small codebase (~500 lines)
- Used in production systems
- https://github.com/marton78/pffft

**Implementation plan:**
1. Add `pffft.c/h` to `src/native/utils/`
2. Wrap in FFT class interface
3. Keep current implementation as fallback
4. Update `binding.gyp`

**Expected improvement:** 8-10x faster (~10-20 microseconds)

**Code example:**
```cpp
class FFT {
private:
    PFFFT_Setup* setup_;
    std::vector<float> work_;

public:
    FFT(int size) : size_(size) {
        setup_ = pffft_new_setup(size, PFFFT_REAL);
        work_.resize(size);
    }

    void Forward(const float* input, std::complex<float>* output) {
        pffft_transform_ordered(setup_, input,
            reinterpret_cast<float*>(output),
            work_.data(), PFFFT_FORWARD);
    }
};
```

### Option 3: Integrate Kiss FFT (Simple Alternative)

**Why Kiss FFT:**
- Public domain (no license restrictions)
- Very simple API
- Reasonably fast
- https://github.com/mborgerding/kissfft

**Expected improvement:** 5-7x faster (~20-30 microseconds)

### Option 4: Integrate FFTW (Maximum Performance)

**Why FFTW:**
- Fastest FFT library available
- Industry standard
- Runtime plan optimization

**Drawbacks:**
- GPL license (requires commercial license for proprietary use)
- Larger dependency
- More complex API

**Expected improvement:** 10-15x faster (~8-15 microseconds)

## Recommendation

**For production use:** Option 2 (PFFFT)
- Best performance/complexity trade-off
- Permissive license
- Battle-tested in audio applications

**For learning/experimentation:** Option 1
- Understand optimization techniques
- No external dependencies
- Good enough for basic use

## When to Optimize

Optimize when you encounter:
- Multiple AnalyserNodes running simultaneously
- Low-latency requirements (< 128 sample buffer sizes)
- CPU usage concerns
- Mobile/embedded deployment
- Real-time visualization performance issues

## Current Performance is Acceptable For:
- 1-2 AnalyserNodes
- Desktop applications
- Non-critical visualization
- Development/testing
- Buffer sizes >= 512 samples

## Implementation Priority

**Low priority** - Current implementation works correctly. Only optimize if:
1. Performance profiling shows FFT is a bottleneck
2. Deploying to resource-constrained environments
3. Need to support many simultaneous analysers
4. User complaints about performance

## Benchmarking Plan

Before optimizing, measure current performance:

```javascript
// test/benchmark-fft.js
const { AudioContext } = require('./src/javascript/index.js');
const context = new AudioContext();
const analyser = context.createAnalyser();
analyser.fftSize = 2048;

// Generate test signal
const buffer = context.createBuffer(1, 2048, 44100);
const data = buffer.getChannelData(0);
for (let i = 0; i < 2048; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
}

// Benchmark
const iterations = 10000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
    const freq = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freq);
}
const end = performance.now();
console.log(`Average FFT time: ${(end - start) / iterations} ms`);
```

## References

- PFFFT: https://github.com/marton78/pffft
- Kiss FFT: https://github.com/mborgerding/kissfft
- FFTW: https://www.fftw.org/
- "What Every Computer Scientist Should Know About Floating-Point Arithmetic"
- Intel Intrinsics Guide: https://www.intel.com/content/www/us/en/docs/intrinsics-guide/
