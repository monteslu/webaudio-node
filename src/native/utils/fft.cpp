#include "fft.h"
#include <cmath>
#include <algorithm>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

FFT::FFT(int size) : size_(size), log2_size_(0) {
	// Size must be power of 2
	int n = size_;
	while (n > 1) {
		if (n % 2 != 0) {
			// Not a power of 2, round up
			size_ = 1;
			while (size_ < size) {
				size_ *= 2;
				log2_size_++;
			}
			break;
		}
		n /= 2;
		log2_size_++;
	}

	ComputeTwiddleFactors();
	ComputeBitReverseTable();
	inverse_temp_.resize(size_);
}

void FFT::ComputeTwiddleFactors() {
	twiddle_factors_.resize(size_);
	for (int i = 0; i < size_; ++i) {
		float angle = -2.0f * M_PI * i / size_;
		twiddle_factors_[i] = std::complex<float>(std::cos(angle), std::sin(angle));
	}
}

void FFT::ComputeBitReverseTable() {
	bit_reverse_table_.resize(size_);
	for (int i = 0; i < size_; ++i) {
		int reversed = 0;
		int temp = i;
		for (int j = 0; j < log2_size_; ++j) {
			reversed = (reversed << 1) | (temp & 1);
			temp >>= 1;
		}
		bit_reverse_table_[i] = reversed;
	}
}

void FFT::BitReversePermutation(std::complex<float>* data) {
	// Use pre-computed bit reversal table
	for (int i = 0; i < size_; ++i) {
		int j = bit_reverse_table_[i];
		if (i < j) {
			std::swap(data[i], data[j]);
		}
	}
}

void FFT::Forward(const float* __restrict input, std::complex<float>* __restrict output) {
	// Copy input to output as complex numbers
	for (int i = 0; i < size_; ++i) {
		output[i] = std::complex<float>(input[i], 0.0f);
	}

	// Bit-reverse permutation
	BitReversePermutation(output);

	// Use Radix-4 where possible (for sizes divisible by 4)
	// Radix-4 has fewer stages and trivial twiddles: 1, -i, -1, i
	const std::complex<float>* __restrict tw = twiddle_factors_.data();

	// Process radix-4 stages (2 bits at a time)
	int stage = 0;
	for (; stage + 1 < log2_size_; stage += 2) {
		const int m = 1 << (stage + 2);  // 4 * 2^stage
		const int m4 = m >> 2;           // m/4
		const int step = size_ >> (stage + 2);

		for (int k = 0; k < size_; k += m) {
			// First quarter - twiddle = 1
			for (int j = 0; j < m4; ++j) {
				const int i0 = k + j;
				const int i1 = i0 + m4;
				const int i2 = i1 + m4;
				const int i3 = i2 + m4;

				// Load inputs
				const float x0r = output[i0].real();
				const float x0i = output[i0].imag();
				const float x1r = output[i1].real();
				const float x1i = output[i1].imag();
				const float x2r = output[i2].real();
				const float x2i = output[i2].imag();
				const float x3r = output[i3].real();
				const float x3i = output[i3].imag();

				// Radix-4 butterfly with twiddle factors 1, W, W², W³
				const int tw_idx = j * step;
				const float w1r = tw[tw_idx].real();
				const float w1i = tw[tw_idx].imag();
				const float w2r = tw[tw_idx * 2].real();
				const float w2i = tw[tw_idx * 2].imag();
				const float w3r = tw[tw_idx * 3].real();
				const float w3i = tw[tw_idx * 3].imag();

				// Apply twiddles
				const float t1r = w1r * x1r - w1i * x1i;
				const float t1i = w1r * x1i + w1i * x1r;
				const float t2r = w2r * x2r - w2i * x2i;
				const float t2i = w2r * x2i + w2i * x2r;
				const float t3r = w3r * x3r - w3i * x3i;
				const float t3i = w3r * x3i + w3i * x3r;

				// Radix-4 butterfly
				const float a0r = x0r + t2r;
				const float a0i = x0i + t2i;
				const float a1r = x0r - t2r;
				const float a1i = x0i - t2i;
				const float a2r = t1r + t3r;
				const float a2i = t1i + t3i;
				const float a3r = t1r - t3r;
				const float a3i = t1i - t3i;

				output[i0] = std::complex<float>(a0r + a2r, a0i + a2i);
				output[i1] = std::complex<float>(a1r + a3i, a1i - a3r);  // Multiply by -i
				output[i2] = std::complex<float>(a0r - a2r, a0i - a2i);
				output[i3] = std::complex<float>(a1r - a3i, a1i + a3r);  // Multiply by i
			}
		}
	}

	// Handle remaining radix-2 stage if size is not a power of 4
	if (stage < log2_size_) {
		const int m = 1 << (stage + 1);
		const int m2 = m >> 1;
		const int step = size_ >> (stage + 1);

		for (int k = 0; k < size_; k += m) {
			for (int j = 0; j < m2; ++j) {
				const int idx_top = k + j;
				const int idx_bot = idx_top + m2;

				const float tw_real = tw[j * step].real();
				const float tw_imag = tw[j * step].imag();
				const float bot_real = output[idx_bot].real();
				const float bot_imag = output[idx_bot].imag();

				const float t_real = tw_real * bot_real - tw_imag * bot_imag;
				const float t_imag = tw_real * bot_imag + tw_imag * bot_real;

				const float u_real = output[idx_top].real();
				const float u_imag = output[idx_top].imag();

				output[idx_top] = std::complex<float>(u_real + t_real, u_imag + t_imag);
				output[idx_bot] = std::complex<float>(u_real - t_real, u_imag - t_imag);
			}
		}
	}
}

void FFT::Inverse(const std::complex<float>* __restrict input, float* __restrict output) {
	// Use pre-allocated member buffer
	std::complex<float>* __restrict temp_ptr = inverse_temp_.data();

	// Copy and conjugate input
	for (int i = 0; i < size_; ++i) {
		temp_ptr[i] = std::conj(input[i]);
	}

	// Bit-reverse permutation
	BitReversePermutation(temp_ptr);

	// Use Radix-4 where possible (same as Forward)
	const std::complex<float>* __restrict tw = twiddle_factors_.data();

	// Process radix-4 stages (2 bits at a time)
	int stage = 0;
	for (; stage + 1 < log2_size_; stage += 2) {
		const int m = 1 << (stage + 2);
		const int m4 = m >> 2;
		const int step = size_ >> (stage + 2);

		for (int k = 0; k < size_; k += m) {
			for (int j = 0; j < m4; ++j) {
				const int i0 = k + j;
				const int i1 = i0 + m4;
				const int i2 = i1 + m4;
				const int i3 = i2 + m4;

				const float x0r = temp_ptr[i0].real();
				const float x0i = temp_ptr[i0].imag();
				const float x1r = temp_ptr[i1].real();
				const float x1i = temp_ptr[i1].imag();
				const float x2r = temp_ptr[i2].real();
				const float x2i = temp_ptr[i2].imag();
				const float x3r = temp_ptr[i3].real();
				const float x3i = temp_ptr[i3].imag();

				const int tw_idx = j * step;
				const float w1r = tw[tw_idx].real();
				const float w1i = tw[tw_idx].imag();
				const float w2r = tw[tw_idx * 2].real();
				const float w2i = tw[tw_idx * 2].imag();
				const float w3r = tw[tw_idx * 3].real();
				const float w3i = tw[tw_idx * 3].imag();

				const float t1r = w1r * x1r - w1i * x1i;
				const float t1i = w1r * x1i + w1i * x1r;
				const float t2r = w2r * x2r - w2i * x2i;
				const float t2i = w2r * x2i + w2i * x2r;
				const float t3r = w3r * x3r - w3i * x3i;
				const float t3i = w3r * x3i + w3i * x3r;

				const float a0r = x0r + t2r;
				const float a0i = x0i + t2i;
				const float a1r = x0r - t2r;
				const float a1i = x0i - t2i;
				const float a2r = t1r + t3r;
				const float a2i = t1i + t3i;
				const float a3r = t1r - t3r;
				const float a3i = t1i - t3i;

				temp_ptr[i0] = std::complex<float>(a0r + a2r, a0i + a2i);
				temp_ptr[i1] = std::complex<float>(a1r + a3i, a1i - a3r);
				temp_ptr[i2] = std::complex<float>(a0r - a2r, a0i - a2i);
				temp_ptr[i3] = std::complex<float>(a1r - a3i, a1i + a3r);
			}
		}
	}

	// Handle remaining radix-2 stage if size is not a power of 4
	if (stage < log2_size_) {
		const int m = 1 << (stage + 1);
		const int m2 = m >> 1;
		const int step = size_ >> (stage + 1);

		for (int k = 0; k < size_; k += m) {
			for (int j = 0; j < m2; ++j) {
				const int idx_top = k + j;
				const int idx_bot = idx_top + m2;

				const float tw_real = tw[j * step].real();
				const float tw_imag = tw[j * step].imag();
				const float bot_real = temp_ptr[idx_bot].real();
				const float bot_imag = temp_ptr[idx_bot].imag();

				const float t_real = tw_real * bot_real - tw_imag * bot_imag;
				const float t_imag = tw_real * bot_imag + tw_imag * bot_real;

				const float u_real = temp_ptr[idx_top].real();
				const float u_imag = temp_ptr[idx_top].imag();

				temp_ptr[idx_top] = std::complex<float>(u_real + t_real, u_imag + t_imag);
				temp_ptr[idx_bot] = std::complex<float>(u_real - t_real, u_imag - t_imag);
			}
		}
	}

	// Conjugate and normalize by 1/N
	const float scale = 1.0f / size_;
	for (int i = 0; i < size_; ++i) {
		output[i] = temp_ptr[i].real() * scale;
	}
}

void FFT::GetMagnitude(const std::complex<float>* complex_data, float* magnitude, int size) {
#ifdef __ARM_NEON
	// SIMD version: Process 4 complex numbers at a time
	// Magnitude = sqrt(real^2 + imag^2)
	const float* __restrict data = reinterpret_cast<const float*>(complex_data);

	int i = 0;
	for (; i + 3 < size; i += 4) {
		// Load 4 complex numbers: [r0, i0, r1, i1, r2, i2, r3, i3]
		float32x4x2_t complex_vals = vld2q_f32(&data[i * 2]);
		float32x4_t real = complex_vals.val[0];  // [r0, r1, r2, r3]
		float32x4_t imag = complex_vals.val[1];  // [i0, i1, i2, i3]

		// Compute real^2 and imag^2
		float32x4_t real_sq = vmulq_f32(real, real);
		float32x4_t imag_sq = vmulq_f32(imag, imag);

		// Sum: real^2 + imag^2
		float32x4_t sum = vaddq_f32(real_sq, imag_sq);

		// Square root
		float32x4_t mag = vsqrtq_f32(sum);

		// Store
		vst1q_f32(&magnitude[i], mag);
	}

	// Handle remaining elements
	for (; i < size; ++i) {
		magnitude[i] = std::abs(complex_data[i]);
	}
#else
	// Scalar version
	for (int i = 0; i < size; ++i) {
		magnitude[i] = std::abs(complex_data[i]);
	}
#endif
}

void FFT::MagnitudeToDecibels(const float* magnitude, float* decibels, int size, float min_db, float max_db) {
	for (int i = 0; i < size; ++i) {
		// Convert magnitude to decibels: 20 * log10(magnitude)
		// Avoid log(0) by clamping to a minimum value
		float mag = std::max(magnitude[i], 1e-10f);
		float db = 20.0f * std::log10(mag);

		// Clamp to range
		db = std::max(min_db, std::min(max_db, db));
		decibels[i] = db;
	}
}

} // namespace webaudio
