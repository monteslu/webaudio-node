#include "mixer.h"
#include <cstring>
#include <algorithm>

// SIMD intrinsics headers
#ifdef __ARM_NEON__
#include <arm_neon.h>
#endif

#if defined(__SSE__) || defined(__SSE2__)
#include <xmmintrin.h>
#include <emmintrin.h>
#endif

#if defined(__AVX__) || defined(__AVX2__)
#include <immintrin.h>
#endif

namespace webaudio {

// SIMD-optimized mixing: dest[i] += src[i] * gain
// Uses vectorized instructions for 4-8x speedup
void Mixer::Mix(float* dest, const float* src, int sample_count, float gain) {
	int i = 0;

#if defined(__AVX2__) && defined(__FMA__)
	// AVX2 + FMA: Process 8 samples at once with fused multiply-add (fastest!)
	__m256 gain_vec = _mm256_set1_ps(gain);
	for (; i + 8 <= sample_count; i += 8) {
		__m256 dest_vec = _mm256_loadu_ps(&dest[i]);
		__m256 src_vec = _mm256_loadu_ps(&src[i]);
		dest_vec = _mm256_fmadd_ps(src_vec, gain_vec, dest_vec);  // dest + (src * gain)
		_mm256_storeu_ps(&dest[i], dest_vec);
	}
#elif defined(__AVX__)
	// AVX: Process 8 samples at once (x86-64 with AVX support)
	__m256 gain_vec = _mm256_set1_ps(gain);
	for (; i + 8 <= sample_count; i += 8) {
		__m256 dest_vec = _mm256_loadu_ps(&dest[i]);
		__m256 src_vec = _mm256_loadu_ps(&src[i]);
		__m256 result = _mm256_add_ps(dest_vec, _mm256_mul_ps(src_vec, gain_vec));
		_mm256_storeu_ps(&dest[i], result);
	}
#elif defined(__SSE__)
	// SSE: Process 4 samples at once (x86-64 - always available)
	__m128 gain_vec = _mm_set1_ps(gain);
	for (; i + 4 <= sample_count; i += 4) {
		__m128 dest_vec = _mm_loadu_ps(&dest[i]);
		__m128 src_vec = _mm_loadu_ps(&src[i]);
		__m128 result = _mm_add_ps(dest_vec, _mm_mul_ps(src_vec, gain_vec));
		_mm_storeu_ps(&dest[i], result);
	}
#elif defined(__ARM_NEON__)
	// NEON: Process 4 samples at once (ARM64 - always available)
	float32x4_t gain_vec = vdupq_n_f32(gain);
	for (; i + 4 <= sample_count; i += 4) {
		float32x4_t dest_vec = vld1q_f32(&dest[i]);
		float32x4_t src_vec = vld1q_f32(&src[i]);
		dest_vec = vmlaq_f32(dest_vec, src_vec, gain_vec);  // dest += src * gain (fused multiply-add)
		vst1q_f32(&dest[i], dest_vec);
	}
#endif

	// Scalar fallback for remaining samples
	for (; i < sample_count; ++i) {
		dest[i] += src[i] * gain;
	}
}

void Mixer::Clear(float* buffer, int sample_count) {
	std::memset(buffer, 0, sample_count * sizeof(float));
}

void Mixer::Copy(float* dest, const float* src, int sample_count) {
	std::memcpy(dest, src, sample_count * sizeof(float));
}

void Mixer::ApplyGain(float* buffer, int sample_count, float gain) {
	for (int i = 0; i < sample_count; ++i) {
		buffer[i] *= gain;
	}
}

void Mixer::Clip(float* buffer, int sample_count, float min, float max) {
	for (int i = 0; i < sample_count; ++i) {
		buffer[i] = std::max(min, std::min(max, buffer[i]));
	}
}

} // namespace webaudio
