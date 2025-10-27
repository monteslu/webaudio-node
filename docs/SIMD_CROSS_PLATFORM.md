# SIMD Cross-Platform Support

## The Problem

SIMD instructions are **architecture-specific**:

| Architecture                               | SIMD Instruction Set | Availability                     |
| ------------------------------------------ | -------------------- | -------------------------------- |
| **ARM64** (Apple Silicon, Raspberry Pi 4+) | **NEON**             | ✅ Built-in (mandatory in ARMv8) |
| **ARM64** (newer)                          | **SVE**              | ⚠️ Optional, rare                |
| **x86-64** (Intel/AMD)                     | **SSE/SSE2**         | ✅ Always available (since 2001) |
| **x86-64** (Intel/AMD)                     | **AVX/AVX2**         | ⚠️ Need runtime detection        |
| **x86-64** (Intel/AMD)                     | **AVX-512**          | ⚠️ Only newer chips              |
| **RISC-V**                                 | **RVV**              | ⚠️ Emerging                      |

## Cross-Platform Strategy

### ✅ Recommended: Runtime Detection with Fallback

```cpp
// mixer.h
namespace webaudio {

class Mixer {
public:
    // Public interface (always works)
    static void MixBuffer(float* dest, const float* src, int count, float gain);

private:
    // CPU-specific implementations
    static void MixBuffer_Scalar(float* dest, const float* src, int count, float gain);

#ifdef __ARM_NEON__
    static void MixBuffer_NEON(float* dest, const float* src, int count, float gain);
#endif

#ifdef __SSE__
    static void MixBuffer_SSE(float* dest, const float* src, int count, float gain);
#endif

#ifdef __AVX__
    static void MixBuffer_AVX(float* dest, const float* src, int count, float gain);
#endif

    // Function pointer (set at startup)
    static void (*mix_impl)(float*, const float*, int, float);
};

} // namespace webaudio
```

```cpp
// mixer.cpp
#include "mixer.h"

#ifdef __ARM_NEON__
#include <arm_neon.h>
#endif

#ifdef __SSE__
#include <xmmintrin.h>
#include <emmintrin.h>
#endif

#ifdef __AVX__
#include <immintrin.h>
#endif

namespace webaudio {

// Function pointer (initialized at startup)
void (*Mixer::mix_impl)(float*, const float*, int, float) = nullptr;

// Scalar fallback (works everywhere)
void Mixer::MixBuffer_Scalar(float* dest, const float* src, int count, float gain) {
    for (int i = 0; i < count; ++i) {
        dest[i] += src[i] * gain;
    }
}

#ifdef __ARM_NEON__
void Mixer::MixBuffer_NEON(float* dest, const float* src, int count, float gain) {
    float32x4_t gain_vec = vdupq_n_f32(gain);
    int i = 0;

    // Process 4 samples at a time
    for (; i + 4 <= count; i += 4) {
        float32x4_t dest_vec = vld1q_f32(&dest[i]);
        float32x4_t src_vec = vld1q_f32(&src[i]);
        dest_vec = vmlaq_f32(dest_vec, src_vec, gain_vec);  // dest += src * gain
        vst1q_f32(&dest[i], dest_vec);
    }

    // Handle remainder
    for (; i < count; ++i) {
        dest[i] += src[i] * gain;
    }
}
#endif

#ifdef __SSE__
void Mixer::MixBuffer_SSE(float* dest, const float* src, int count, float gain) {
    __m128 gain_vec = _mm_set1_ps(gain);
    int i = 0;

    // Process 4 samples at a time
    for (; i + 4 <= count; i += 4) {
        __m128 dest_vec = _mm_loadu_ps(&dest[i]);
        __m128 src_vec = _mm_loadu_ps(&src[i]);
        __m128 result = _mm_add_ps(dest_vec, _mm_mul_ps(src_vec, gain_vec));
        _mm_storeu_ps(&dest[i], result);
    }

    // Handle remainder
    for (; i < count; ++i) {
        dest[i] += src[i] * gain;
    }
}
#endif

#ifdef __AVX__
void Mixer::MixBuffer_AVX(float* dest, const float* src, int count, float gain) {
    __m256 gain_vec = _mm256_set1_ps(gain);
    int i = 0;

    // Process 8 samples at a time
    for (; i + 8 <= count; i += 8) {
        __m256 dest_vec = _mm256_loadu_ps(&dest[i]);
        __m256 src_vec = _mm256_loadu_ps(&src[i]);
        __m256 result = _mm256_add_ps(dest_vec, _mm256_mul_ps(src_vec, gain_vec));
        _mm256_storeu_ps(&dest[i], result);
    }

    // Handle remainder
    for (; i < count; ++i) {
        dest[i] += src[i] * gain;
    }
}
#endif

// Auto-detect best implementation at startup
static void InitMixer() {
    #ifdef __AVX__
        Mixer::mix_impl = Mixer::MixBuffer_AVX;
        std::cout << "Using AVX SIMD (8x speedup)" << std::endl;
    #elif defined(__SSE__)
        Mixer::mix_impl = Mixer::MixBuffer_SSE;
        std::cout << "Using SSE SIMD (4x speedup)" << std::endl;
    #elif defined(__ARM_NEON__)
        Mixer::mix_impl = Mixer::MixBuffer_NEON;
        std::cout << "Using NEON SIMD (4x speedup)" << std::endl;
    #else
        Mixer::mix_impl = Mixer::MixBuffer_Scalar;
        std::cout << "Using scalar mixing (no SIMD)" << std::endl;
    #endif
}

// Public API (calls best implementation)
void Mixer::MixBuffer(float* dest, const float* src, int count, float gain) {
    if (!mix_impl) {
        InitMixer();
    }
    mix_impl(dest, src, count, gain);
}

} // namespace webaudio
```

## ARM64 Linux - Specific Notes

### ✅ NEON on ARM64 Linux

**Good news**: NEON is **mandatory** in ARMv8 (ARM64), so it's always available!

```cpp
#ifdef __aarch64__  // or __ARM_ARCH >= 8
    // NEON is ALWAYS available on ARM64!
    // No runtime detection needed
#endif
```

**Platforms where this works:**

- ✅ Apple Silicon (M1/M2/M3) macOS
- ✅ Apple Silicon Linux (Asahi Linux)
- ✅ Raspberry Pi 4/5 (ARM64)
- ✅ AWS Graviton (ARM64 servers)
- ✅ Android ARM64
- ✅ Most ARM64 Linux devices

### Build Flags

**CMake / node-gyp:**

```json
// binding.gyp
{
    "targets": [
        {
            "target_name": "webaudio_native",
            "conditions": [
                [
                    "target_arch=='arm64'",
                    {
                        "cflags": ["-march=armv8-a", "-mfpu=neon"],
                        "cflags_cc": ["-march=armv8-a", "-mfpu=neon"],
                        "xcode_settings": {
                            "OTHER_CFLAGS": ["-march=armv8-a"]
                        }
                    }
                ],
                [
                    "target_arch=='x64'",
                    {
                        "cflags": ["-msse", "-msse2"],
                        "cflags_cc": ["-msse", "-msse2"],
                        "msvs_settings": {
                            "VCCLCompilerTool": {
                                "EnableEnhancedInstructionSet": "2" // SSE2
                            }
                        }
                    }
                ]
            ]
        }
    ]
}
```

## Alternative: Portable SIMD Libraries

Instead of writing CPU-specific code, use a library:

### Option 1: **Highway** (Google's portable SIMD)

```cpp
#include "hwy/highway.h"

void MixBuffer_Highway(float* dest, const float* src, int count, float gain) {
    namespace hn = hwy::HWY_NAMESPACE;
    const hn::ScalableTag<float> d;

    auto gain_vec = hn::Set(d, gain);
    int i = 0;

    for (; i + hn::Lanes(d) <= count; i += hn::Lanes(d)) {
        auto dest_vec = hn::LoadU(d, &dest[i]);
        auto src_vec = hn::LoadU(d, &src[i]);
        auto result = hn::MulAdd(src_vec, gain_vec, dest_vec);
        hn::StoreU(result, d, &dest[i]);
    }

    // Remainder
    for (; i < count; ++i) {
        dest[i] += src[i] * gain;
    }
}
```

**Pros:**

- ✅ One codebase, all platforms
- ✅ Auto-detects best SIMD (AVX-512, AVX2, SSE, NEON)
- ✅ Well-tested by Google

**Cons:**

- ❌ Extra dependency
- ❌ Larger binary

### Option 2: **xsimd** (Lightweight)

Similar to Highway but smaller.

## Testing SIMD on Different Platforms

```bash
# ARM64 Linux (Raspberry Pi, etc.)
$ uname -m
aarch64

$ cat /proc/cpuinfo | grep Features
Features : fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp

# "asimd" = Advanced SIMD (NEON) ✅

# x86-64 Linux
$ cat /proc/cpuinfo | grep flags
flags : ... sse sse2 sse3 ssse3 sse4_1 sse4_2 avx avx2 ...
```

## Recommendation for Your Project

### For Web Audio Node.js Library:

**Strategy**: Compile-time detection with scalar fallback

```cpp
// Simple, works everywhere
#ifdef __ARM_NEON__
    // Use NEON (ARM64)
#elif defined(__SSE__)
    // Use SSE (x86-64)
#else
    // Scalar fallback
#endif
```

**Why?**

- ✅ No runtime overhead
- ✅ Works on ARM64 Linux (NEON always available)
- ✅ Works on x86-64 (SSE/SSE2 always available)
- ✅ Simple code
- ✅ No extra dependencies

**Platforms covered:**

- ✅ macOS (Intel/Apple Silicon)
- ✅ Linux (x86-64/ARM64)
- ✅ Windows (x86-64)
- ✅ Raspberry Pi (ARM64)

## Answer to Your Question

**Q: Will SIMD work on ARM64 Linux?**

**A: Yes! ✅**

- ARM64 (aarch64) **always** has NEON
- It's mandatory in ARMv8 spec
- No runtime detection needed
- Just compile with `-march=armv8-a` and use NEON intrinsics

**Code works on:**

- ✅ Raspberry Pi 4/5 (ARM64 Linux)
- ✅ AWS Graviton servers
- ✅ Any ARM64 Linux system
- ✅ Apple Silicon (macOS/Linux)

**Just need different intrinsics for x86 vs ARM**, but both are equally available!
