#include "convolver_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>

namespace webaudio {

ConvolverNode::ConvolverNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, impulse_length_(0)
	, impulse_channels_(0)
	, history_position_(0)
	, normalize_(true) {

	is_active_ = true;
}

void ConvolverNode::SetBuffer(const float* data, int length, int num_channels) {
	std::lock_guard<std::mutex> lock(buffer_mutex_);

	impulse_length_ = length;
	impulse_channels_ = num_channels;

	// Copy impulse response
	impulse_response_.resize(length * num_channels);
	std::memcpy(impulse_response_.data(), data, length * num_channels * sizeof(float));

	// Apply normalization if enabled
	if (normalize_) {
		float scale = ComputeNormalizationScale();
		if (scale > 0.0f) {
			for (size_t i = 0; i < impulse_response_.size(); ++i) {
				impulse_response_[i] *= scale;
			}
		}
	}

	// Allocate input history buffer (need to store impulse_length samples)
	// For stereo, store both channels interleaved
	input_history_.resize(impulse_length_ * channels_, 0.0f);
	history_position_ = 0;
}

float ConvolverNode::ComputeNormalizationScale() {
	if (impulse_response_.empty()) {
		return 1.0f;
	}

	// Find maximum absolute value across all channels
	float max_val = 0.0f;
	for (float sample : impulse_response_) {
		max_val = std::max(max_val, std::abs(sample));
	}

	// Return reciprocal for scaling (avoid division in hot path)
	return (max_val > 0.0f) ? (1.0f / max_val) : 1.0f;
}

void ConvolverNode::Process(float* output, int frame_count) {
	// Clear output
	ClearBuffer(output, frame_count);

	if (impulse_length_ == 0 || impulse_response_.empty()) {
		return; // No impulse response set
	}

	// Mix all inputs
	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffer_.resize(frame_count * channels_, 0.0f);
			}

			std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));
			input_node->Process(input_buffer_.data(), frame_count);

			// Process convolution
			ProcessDirect(output, input_buffer_.data(), frame_count);
		}
	}
}

void ConvolverNode::ProcessDirect(float* output, const float* input, int frame_count) {
	std::lock_guard<std::mutex> lock(buffer_mutex_);

	if (impulse_length_ == 0) {
		return;
	}

	// Determine processing mode
	bool mono_impulse = (impulse_channels_ == 1);
	bool stereo_output = (channels_ == 2);

	for (int frame = 0; frame < frame_count; ++frame) {
		// Add current input samples to history
		for (int ch = 0; ch < channels_; ++ch) {
			input_history_[history_position_ * channels_ + ch] = input[frame * channels_ + ch];
		}

		// Perform convolution for this frame
		if (mono_impulse && !stereo_output) {
			// Mono-to-mono convolution
			float sum = 0.0f;
			int hist_idx = history_position_;

			for (int i = 0; i < impulse_length_; ++i) {
				sum += input_history_[hist_idx] * impulse_response_[i];
				hist_idx = (hist_idx == 0) ? (impulse_length_ - 1) : (hist_idx - 1);
			}

			output[frame] += sum;

		} else if (mono_impulse && stereo_output) {
			// Mono impulse to stereo output (same convolution for both channels)
			float sum = 0.0f;
			int hist_idx = history_position_;

			for (int i = 0; i < impulse_length_; ++i) {
				// Average both input channels if stereo input
				float input_sample = (input_history_[hist_idx * 2] + input_history_[hist_idx * 2 + 1]) * 0.5f;
				sum += input_sample * impulse_response_[i];
				hist_idx = (hist_idx == 0) ? (impulse_length_ - 1) : (hist_idx - 1);
			}

			output[frame * 2] += sum;
			output[frame * 2 + 1] += sum;

		} else if (!mono_impulse && stereo_output) {
			// Stereo-to-stereo convolution
			float sum_left = 0.0f;
			float sum_right = 0.0f;
			int hist_idx = history_position_;

			for (int i = 0; i < impulse_length_; ++i) {
				float input_left = input_history_[hist_idx * 2];
				float input_right = input_history_[hist_idx * 2 + 1];

				sum_left += input_left * impulse_response_[i * 2] +
				           input_right * impulse_response_[i * 2 + 1];
				sum_right += input_left * impulse_response_[i * 2 + 1] +
				            input_right * impulse_response_[i * 2];

				hist_idx = (hist_idx == 0) ? (impulse_length_ - 1) : (hist_idx - 1);
			}

			output[frame * 2] += sum_left;
			output[frame * 2 + 1] += sum_right;

		} else {
			// Stereo impulse to mono output - downmix
			float sum = 0.0f;
			int hist_idx = history_position_;

			for (int i = 0; i < impulse_length_; ++i) {
				float avg_impulse = (impulse_response_[i * 2] + impulse_response_[i * 2 + 1]) * 0.5f;
				sum += input_history_[hist_idx] * avg_impulse;
				hist_idx = (hist_idx == 0) ? (impulse_length_ - 1) : (hist_idx - 1);
			}

			output[frame] += sum;
		}

		// Advance history position
		history_position_ = (history_position_ + 1) % impulse_length_;
	}
}

} // namespace webaudio
