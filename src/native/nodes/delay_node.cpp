#include "delay_node.h"
#include <cstring>
#include <algorithm>

namespace webaudio {

DelayNode::DelayNode(int sample_rate, int channels, float max_delay_time)
	: AudioNode(sample_rate, channels)
	, delay_time_param_(std::make_unique<AudioParam>(0.0f, 0.0f, max_delay_time))
	// , max_delay_time_(max_delay_time)  // Removed - not used, could validate delay_time
	, write_positions_(channels, 0) {

	is_active_ = true;

	// Allocate delay buffers
	max_delay_samples_ = static_cast<int>(max_delay_time * sample_rate) + 1;
	delay_buffers_.resize(channels);
	for (int ch = 0; ch < channels; ++ch) {
		delay_buffers_[ch].resize(max_delay_samples_, 0.0f);
	}
}

void DelayNode::SetParameter(const std::string& name, float value) {
	if (name == "delayTime") {
		delay_time_param_->SetValue(value);
	}
}

void DelayNode::Process(float* output, int frame_count) {
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

	// Apply delay
	float delay_time = delay_time_param_->GetValue();
	int delay_samples = static_cast<int>(delay_time * sample_rate_);
	delay_samples = std::min(delay_samples, max_delay_samples_ - 1);

	for (int frame = 0; frame < frame_count; ++frame) {
		for (int ch = 0; ch < channels_; ++ch) {
			int idx = frame * channels_ + ch;

			// Read from delay buffer
			int read_pos = write_positions_[ch] - delay_samples;
			if (read_pos < 0) {
				read_pos += max_delay_samples_;
			}

			float delayed_sample = delay_buffers_[ch][read_pos];

			// Write input to delay buffer
			delay_buffers_[ch][write_positions_[ch]] = output[idx];

			// Output delayed sample
			output[idx] = delayed_sample;

			// Increment write position
			write_positions_[ch] = (write_positions_[ch] + 1) % max_delay_samples_;
		}
	}
}

} // namespace webaudio
