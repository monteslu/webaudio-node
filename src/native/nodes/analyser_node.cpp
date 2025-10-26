#include "analyser_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>

namespace webaudio {

AnalyserNode::AnalyserNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, fft_size_(2048)
	, min_decibels_(-100.0f)
	, max_decibels_(-30.0f)
	, smoothing_time_constant_(0.8f)
	, write_index_(0) {

	is_active_ = true;

	// Initialize buffers
	time_buffer_.resize(fft_size_, 0.0f);
	fft_ = std::make_unique<FFT>(fft_size_);
	fft_output_.resize(fft_size_);
	magnitude_spectrum_.resize(fft_size_ / 2, 0.0f);
	smoothed_spectrum_.resize(fft_size_ / 2, 0.0f);
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
	write_index_ = 0;
}

void AnalyserNode::Process(float* output, int frame_count) {
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
	std::lock_guard<std::mutex> lock(data_mutex_);
	for (int frame = 0; frame < frame_count; ++frame) {
		// Mix all channels to mono
		float sample = 0.0f;
		for (int ch = 0; ch < channels_; ++ch) {
			sample += output[frame * channels_ + ch];
		}
		sample /= channels_;

		time_buffer_[write_index_] = sample;
		write_index_ = (write_index_ + 1) % fft_size_;
	}
}

void AnalyserNode::UpdateFFT() {
	// Prepare input buffer in correct order (from write_index_ to end, then from start)
	std::vector<float> ordered_buffer(fft_size_);

	int idx = 0;
	for (int i = write_index_; i < fft_size_; ++i) {
		ordered_buffer[idx++] = time_buffer_[i];
	}
	for (int i = 0; i < write_index_; ++i) {
		ordered_buffer[idx++] = time_buffer_[i];
	}

	// Apply Hann window
	for (int i = 0; i < fft_size_; ++i) {
		float window = 0.5f * (1.0f - std::cos(2.0f * M_PI * i / fft_size_));
		ordered_buffer[i] *= window;
	}

	// Perform FFT
	fft_->Forward(ordered_buffer.data(), fft_output_.data());

	// Get magnitude spectrum
	fft_->GetMagnitude(fft_output_.data(), magnitude_spectrum_.data(), fft_size_ / 2);

	// Normalize by FFT size (Web Audio API requirement)
	float normalization = 1.0f / fft_size_;
	for (int i = 0; i < fft_size_ / 2; ++i) {
		magnitude_spectrum_[i] *= normalization;
	}

	// Apply smoothing
	for (int i = 0; i < fft_size_ / 2; ++i) {
		smoothed_spectrum_[i] = smoothing_time_constant_ * smoothed_spectrum_[i] +
		                        (1.0f - smoothing_time_constant_) * magnitude_spectrum_[i];
	}
}

void AnalyserNode::GetFloatFrequencyData(float* array, int array_size) {
	std::lock_guard<std::mutex> lock(data_mutex_);
	UpdateFFT();

	int bin_count = std::min(array_size, fft_size_ / 2);

	// Convert to decibels
	for (int i = 0; i < bin_count; ++i) {
		float mag = std::max(smoothed_spectrum_[i], 1e-10f);
		float db = 20.0f * std::log10(mag);
		array[i] = std::max(min_decibels_, std::min(max_decibels_, db));
	}
}

void AnalyserNode::GetByteFrequencyData(uint8_t* array, int array_size) {
	std::vector<float> float_data(array_size);
	GetFloatFrequencyData(float_data.data(), array_size);

	// Convert to byte range [0, 255]
	float range = max_decibels_ - min_decibels_;
	for (int i = 0; i < array_size; ++i) {
		float normalized = (float_data[i] - min_decibels_) / range;
		array[i] = static_cast<uint8_t>(std::max(0.0f, std::min(255.0f, normalized * 255.0f)));
	}
}

void AnalyserNode::GetFloatTimeDomainData(float* array, int array_size) {
	std::lock_guard<std::mutex> lock(data_mutex_);

	int samples = std::min(array_size, fft_size_);

	// Copy from circular buffer in correct order
	int idx = 0;
	for (int i = write_index_; i < fft_size_ && idx < samples; ++i, ++idx) {
		array[idx] = time_buffer_[i];
	}
	for (int i = 0; i < write_index_ && idx < samples; ++i, ++idx) {
		array[idx] = time_buffer_[i];
	}
}

void AnalyserNode::GetByteTimeDomainData(uint8_t* array, int array_size) {
	std::vector<float> float_data(array_size);
	GetFloatTimeDomainData(float_data.data(), array_size);

	// Convert to byte range [0, 255], where 128 is zero
	for (int i = 0; i < array_size; ++i) {
		float sample = std::max(-1.0f, std::min(1.0f, float_data[i]));
		array[i] = static_cast<uint8_t>((sample + 1.0f) * 127.5f);
	}
}

} // namespace webaudio
