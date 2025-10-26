#include "analyser_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

namespace webaudio {

AnalyserNode::AnalyserNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, fft_size_(2048)
	, min_decibels_(-100.0f)
	, max_decibels_(-30.0f)
	, smoothing_time_constant_(0.8f)
	, write_index_(0)
	, last_fft_write_index_(-1)
	, fft_dirty_(true)
	, freq_data_dirty_(true) {

	is_active_ = true;

	// Initialize buffers
	time_buffer_.resize(fft_size_, 0.0f);
	fft_ = std::make_unique<FFT>(fft_size_);
	fft_output_.resize(fft_size_);
	magnitude_spectrum_.resize(fft_size_ / 2, 0.0f);
	smoothed_spectrum_.resize(fft_size_ / 2, 0.0f);
	cached_freq_data_.resize(fft_size_ / 2, min_decibels_);
	hann_window_.resize(fft_size_);
	ordered_buffer_.resize(fft_size_);
	ComputeHannWindow();
}

void AnalyserNode::SetFFTSize(int size) {
	std::lock_guard<std::mutex> lock(data_mutex_);

	// Ensure power of 2, between 32 and 32768
	size = std::max(32, std::min(32768, size));

	int power_of_2 = 32;
	while (power_of_2 < size) {
		power_of_2 *= 2;
	}
	fft_size_ = power_of_2;

	// Resize buffers
	time_buffer_.resize(fft_size_, 0.0f);
	fft_ = std::make_unique<FFT>(fft_size_);
	fft_output_.resize(fft_size_);
	magnitude_spectrum_.resize(fft_size_ / 2, 0.0f);
	smoothed_spectrum_.resize(fft_size_ / 2, 0.0f);
	hann_window_.resize(fft_size_);
	ordered_buffer_.resize(fft_size_);
	write_index_ = 0;
	ComputeHannWindow();
}

void AnalyserNode::ComputeHannWindow() {
	// Pre-compute Hann window: 0.5 * (1 - cos(2*pi*i/N))
	const float scale = 2.0f * M_PI / fft_size_;
	for (int i = 0; i < fft_size_; ++i) {
		hann_window_[i] = 0.5f * (1.0f - std::cos(scale * i));
	}
}

void AnalyserNode::Process(float* output, int frame_count, int output_index) {
	// Clear output
	ClearBuffer(output, frame_count);

	// Mix all inputs
	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffer_.resize(frame_count * channels_, 0.0f);
			}

			std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));
			input_node->Process(input_buffer_.data(), frame_count);
			MixBuffer(output, input_buffer_.data(), frame_count);
		}
	}

	// Store samples in circular buffer (mix down to mono for analysis)
	// Use lock-free atomic for write_index_ to avoid mutex overhead
	// Read side uses memory_order_acquire, write side uses memory_order_release

	// Optimized path for stereo (most common case)
	if (channels_ == 2) {
		const float scale = 0.5f;
		int write_idx = write_index_.load(std::memory_order_relaxed);
		const int mask = fft_size_ - 1;  // FFT size is always power of 2
		for (int frame = 0; frame < frame_count; ++frame) {
			float sample = (output[frame * 2] + output[frame * 2 + 1]) * scale;
			time_buffer_[write_idx] = sample;
			write_idx = (write_idx + 1) & mask;  // Branchless wrap using bit mask
		}
		write_index_.store(write_idx, std::memory_order_release);
	} else {
		// General path for other channel counts
		const float inv_channels = 1.0f / channels_;
		int write_idx = write_index_.load(std::memory_order_relaxed);
		const int mask = fft_size_ - 1;  // FFT size is always power of 2
		for (int frame = 0; frame < frame_count; ++frame) {
			float sample = 0.0f;
			for (int ch = 0; ch < channels_; ++ch) {
				sample += output[frame * channels_ + ch];
			}
			sample *= inv_channels;

			time_buffer_[write_idx] = sample;
			write_idx = (write_idx + 1) & mask;  // Branchless wrap using bit mask
		}
		write_index_.store(write_idx, std::memory_order_release);
	}

	// Mark FFT as dirty since we have new data (atomic flag)
	fft_dirty_.store(true, std::memory_order_release);
}

void AnalyserNode::UpdateFFT() {
	// Prepare input buffer in correct order and apply pre-computed Hann window - SIMD optimized
	const int write_idx = write_index_.load(std::memory_order_acquire);

#ifdef __ARM_NEON
	// SIMD path: process 4 samples at a time for windowing
	int idx = 0;
	int i = write_idx;

	// First segment: from write_index to fft_size_
	const int first_segment_size = fft_size_ - write_idx;
	const int first_simd_count = (first_segment_size / 4) * 4;

	for (int j = 0; j < first_simd_count; j += 4, i += 4, idx += 4) {
		float32x4_t time_samples = vld1q_f32(&time_buffer_[i]);
		float32x4_t window_samples = vld1q_f32(&hann_window_[idx]);
		float32x4_t result = vmulq_f32(time_samples, window_samples);
		vst1q_f32(&ordered_buffer_[idx], result);
	}

	// Scalar cleanup for first segment
	for (; i < fft_size_; ++i, ++idx) {
		ordered_buffer_[idx] = time_buffer_[i] * hann_window_[idx];
	}

	// Second segment: from 0 to write_index_
	i = 0;
	const int second_simd_count = (write_idx / 4) * 4;

	for (int j = 0; j < second_simd_count; j += 4, i += 4, idx += 4) {
		float32x4_t time_samples = vld1q_f32(&time_buffer_[i]);
		float32x4_t window_samples = vld1q_f32(&hann_window_[idx]);
		float32x4_t result = vmulq_f32(time_samples, window_samples);
		vst1q_f32(&ordered_buffer_[idx], result);
	}

	// Scalar cleanup for second segment
	for (; i < write_idx; ++i, ++idx) {
		ordered_buffer_[idx] = time_buffer_[i] * hann_window_[idx];
	}
#else
	// Scalar fallback
	int idx = 0;
	for (int i = write_idx; i < fft_size_; ++i, ++idx) {
		ordered_buffer_[idx] = time_buffer_[i] * hann_window_[idx];
	}
	for (int i = 0; i < write_idx; ++i, ++idx) {
		ordered_buffer_[idx] = time_buffer_[i] * hann_window_[idx];
	}
#endif

	// Perform FFT
	fft_->Forward(ordered_buffer_.data(), fft_output_.data());

	// Get magnitude spectrum
	fft_->GetMagnitude(fft_output_.data(), magnitude_spectrum_.data(), fft_size_ / 2);

	// Normalize by FFT size (Web Audio API requirement) - SIMD optimized
	const float normalization = 1.0f / fft_size_;
	const int half_size = fft_size_ / 2;

#ifdef __ARM_NEON
	const int simd_count = (half_size / 4) * 4;
	const float32x4_t norm_vec = vdupq_n_f32(normalization);

	// Vectorized normalization
	for (int i = 0; i < simd_count; i += 4) {
		float32x4_t mag = vld1q_f32(&magnitude_spectrum_[i]);
		mag = vmulq_f32(mag, norm_vec);
		vst1q_f32(&magnitude_spectrum_[i], mag);
	}

	// Scalar cleanup
	for (int i = simd_count; i < half_size; ++i) {
		magnitude_spectrum_[i] *= normalization;
	}
#else
	for (int i = 0; i < half_size; ++i) {
		magnitude_spectrum_[i] *= normalization;
	}
#endif

	// Apply smoothing - SIMD optimized
	const float smooth_k = smoothing_time_constant_;
	const float smooth_k_inv = 1.0f - smoothing_time_constant_;

#ifdef __ARM_NEON
	const float32x4_t k_vec = vdupq_n_f32(smooth_k);
	const float32x4_t k_inv_vec = vdupq_n_f32(smooth_k_inv);

	// Vectorized smoothing
	for (int i = 0; i < simd_count; i += 4) {
		float32x4_t smoothed = vld1q_f32(&smoothed_spectrum_[i]);
		float32x4_t mag = vld1q_f32(&magnitude_spectrum_[i]);

		// smoothed = k * smoothed + (1-k) * mag
		smoothed = vmulq_f32(smoothed, k_vec);
		smoothed = vmlaq_f32(smoothed, mag, k_inv_vec);

		vst1q_f32(&smoothed_spectrum_[i], smoothed);
	}

	// Scalar cleanup
	for (int i = simd_count; i < half_size; ++i) {
		smoothed_spectrum_[i] = smooth_k * smoothed_spectrum_[i] + smooth_k_inv * magnitude_spectrum_[i];
	}
#else
	for (int i = 0; i < half_size; ++i) {
		smoothed_spectrum_[i] = smooth_k * smoothed_spectrum_[i] + smooth_k_inv * magnitude_spectrum_[i];
	}
#endif
}

void AnalyserNode::GetFloatFrequencyData(float* array, int array_size) {
	std::lock_guard<std::mutex> lock(data_mutex_);

	// Only recompute FFT if data has changed since last call
	// Use acquire to synchronize with Process()'s release
	int current_write_index = write_index_.load(std::memory_order_acquire);
	bool is_dirty = fft_dirty_.load(std::memory_order_acquire);

	if (is_dirty || current_write_index != last_fft_write_index_) {
		UpdateFFT();
		last_fft_write_index_ = current_write_index;
		fft_dirty_.store(false, std::memory_order_relaxed);
		freq_data_dirty_ = true;  // FFT changed, need to recompute dB
	}

	int bin_count = std::min(array_size, fft_size_ / 2);

	// Only recompute dB conversion if FFT changed
	if (freq_data_dirty_) {
		constexpr float min_mag = 1e-10f;
		const float scale = 20.0f;

		// Cache the dB-converted data
		for (int i = 0; i < fft_size_ / 2; ++i) {
			float mag = std::max(smoothed_spectrum_[i], min_mag);
			float db = scale * std::log10(mag);
			cached_freq_data_[i] = std::max(min_decibels_, std::min(max_decibels_, db));
		}
		freq_data_dirty_ = false;
	}

	// Copy from cache - super fast!
	std::memcpy(array, cached_freq_data_.data(), bin_count * sizeof(float));
}

void AnalyserNode::GetByteFrequencyData(uint8_t* array, int array_size) {
	std::vector<float> float_data(array_size);
	GetFloatFrequencyData(float_data.data(), array_size);

	// Convert to byte range [0, 255] - SIMD optimized
	const float range = max_decibels_ - min_decibels_;
	const float inv_range = 1.0f / range;
	const float scale = 255.0f;

#ifdef __ARM_NEON
	const int simd_count = (array_size / 4) * 4;
	const float32x4_t vmin_db = vdupq_n_f32(min_decibels_);
	const float32x4_t vinv_range = vdupq_n_f32(inv_range);
	const float32x4_t vscale = vdupq_n_f32(scale);
	const float32x4_t vzero = vdupq_n_f32(0.0f);
	const float32x4_t vmax = vdupq_n_f32(255.0f);

	// Vectorized conversion: 4 samples at a time
	for (int i = 0; i < simd_count; i += 4) {
		float32x4_t val = vld1q_f32(&float_data[i]);

		// normalized = (val - min_decibels_) * inv_range * 255.0f
		val = vsubq_f32(val, vmin_db);
		val = vmulq_f32(val, vinv_range);
		val = vmulq_f32(val, vscale);

		// Clamp to [0, 255]
		val = vmaxq_f32(val, vzero);
		val = vminq_f32(val, vmax);

		// Convert to uint8 via int32
		int32x4_t ival = vcvtq_s32_f32(val);
		uint16x4_t u16 = vqmovun_s32(ival);
		uint8x8_t u8 = vqmovn_u16(vcombine_u16(u16, u16));

		// Store only first 4 bytes
		vst1_lane_u32((uint32_t*)&array[i], vreinterpret_u32_u8(u8), 0);
	}

	// Scalar cleanup
	for (int i = simd_count; i < array_size; ++i) {
		float normalized = (float_data[i] - min_decibels_) * inv_range * scale;
		array[i] = static_cast<uint8_t>(std::max(0.0f, std::min(255.0f, normalized)));
	}
#else
	// Scalar path
	for (int i = 0; i < array_size; ++i) {
		float normalized = (float_data[i] - min_decibels_) * inv_range * scale;
		array[i] = static_cast<uint8_t>(std::max(0.0f, std::min(255.0f, normalized)));
	}
#endif
}

void AnalyserNode::GetFloatTimeDomainData(float* array, int array_size) {
	std::lock_guard<std::mutex> lock(data_mutex_);

	int samples = std::min(array_size, fft_size_);

	// Use acquire to synchronize with Process()'s release
	int current_write_index = write_index_.load(std::memory_order_acquire);

	// Copy from circular buffer in correct order
	int idx = 0;
	for (int i = current_write_index; i < fft_size_ && idx < samples; ++i, ++idx) {
		array[idx] = time_buffer_[i];
	}
	for (int i = 0; i < current_write_index && idx < samples; ++i, ++idx) {
		array[idx] = time_buffer_[i];
	}
}

void AnalyserNode::GetByteTimeDomainData(uint8_t* array, int array_size) {
	std::vector<float> float_data(array_size);
	GetFloatTimeDomainData(float_data.data(), array_size);

	// Convert to byte range [0, 255], where 128 is zero - SIMD optimized
#ifdef __ARM_NEON
	const int simd_count = (array_size / 4) * 4;
	const float32x4_t vmin = vdupq_n_f32(-1.0f);
	const float32x4_t vmax = vdupq_n_f32(1.0f);
	const float32x4_t vone = vdupq_n_f32(1.0f);
	const float32x4_t vscale = vdupq_n_f32(127.5f);

	// Vectorized conversion: 4 samples at a time
	for (int i = 0; i < simd_count; i += 4) {
		float32x4_t sample = vld1q_f32(&float_data[i]);

		// Clamp to [-1, 1]
		sample = vmaxq_f32(sample, vmin);
		sample = vminq_f32(sample, vmax);

		// Convert: (sample + 1.0) * 127.5
		sample = vaddq_f32(sample, vone);
		sample = vmulq_f32(sample, vscale);

		// Convert to uint8 via int32
		int32x4_t ival = vcvtq_s32_f32(sample);
		uint16x4_t u16 = vqmovun_s32(ival);
		uint8x8_t u8 = vqmovn_u16(vcombine_u16(u16, u16));

		// Store only first 4 bytes
		vst1_lane_u32((uint32_t*)&array[i], vreinterpret_u32_u8(u8), 0);
	}

	// Scalar cleanup
	for (int i = simd_count; i < array_size; ++i) {
		float sample = std::max(-1.0f, std::min(1.0f, float_data[i]));
		array[i] = static_cast<uint8_t>((sample + 1.0f) * 127.5f);
	}
#else
	// Scalar path
	for (int i = 0; i < array_size; ++i) {
		float sample = std::max(-1.0f, std::min(1.0f, float_data[i]));
		array[i] = static_cast<uint8_t>((sample + 1.0f) * 127.5f);
	}
#endif
}

} // namespace webaudio
