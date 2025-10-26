#include "fft.h"
#include <cmath>
#include <algorithm>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

FFT::FFT(int size) : size_(size) {
	// Size must be power of 2
	int n = size_;
	// int count = 0;  // Unused - was for debugging?
	while (n > 1) {
		if (n % 2 != 0) {
			// Not a power of 2, round up
			size_ = 1;
			while (size_ < size) size_ *= 2;
			break;
		}
		n /= 2;
		// count++;  // Unused
	}

	ComputeTwiddleFactors();
}

void FFT::ComputeTwiddleFactors() {
	twiddle_factors_.resize(size_);
	for (int i = 0; i < size_; ++i) {
		float angle = -2.0f * M_PI * i / size_;
		twiddle_factors_[i] = std::complex<float>(std::cos(angle), std::sin(angle));
	}
}

void FFT::BitReversePermutation(std::complex<float>* data) {
	int n = size_;
	int j = 0;

	for (int i = 0; i < n - 1; ++i) {
		if (i < j) {
			std::swap(data[i], data[j]);
		}

		int k = n / 2;
		while (k <= j) {
			j -= k;
			k /= 2;
		}
		j += k;
	}
}

void FFT::Forward(const float* input, std::complex<float>* output) {
	// Copy input to output as complex numbers
	for (int i = 0; i < size_; ++i) {
		output[i] = std::complex<float>(input[i], 0.0f);
	}

	// Bit-reverse permutation
	BitReversePermutation(output);

	// Cooley-Tukey FFT algorithm
	for (int stage = 1; stage <= std::log2(size_); ++stage) {
		int m = 1 << stage; // 2^stage
		int m2 = m / 2;

		// Twiddle factor step
		int step = size_ / m;

		for (int k = 0; k < size_; k += m) {
			for (int j = 0; j < m2; ++j) {
				std::complex<float> t = twiddle_factors_[j * step] * output[k + j + m2];
				std::complex<float> u = output[k + j];

				output[k + j] = u + t;
				output[k + j + m2] = u - t;
			}
		}
	}
}

void FFT::GetMagnitude(const std::complex<float>* complex_data, float* magnitude, int size) {
	for (int i = 0; i < size; ++i) {
		magnitude[i] = std::abs(complex_data[i]);
	}
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
