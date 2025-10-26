#include "channel_merger_node.h"
#include <cstring>
#include <algorithm>

namespace webaudio {

ChannelMergerNode::ChannelMergerNode(int sample_rate, int channels, int number_of_inputs)
	: AudioNode(sample_rate, channels)
	, number_of_inputs_(number_of_inputs) {

	is_active_ = true;

	// Allocate input buffers for each input
	input_buffers_.resize(number_of_inputs_);
	for (auto& buf : input_buffers_) {
		buf.resize(1024 * channels_, 0.0f); // Initial size, will grow as needed
	}
}

void ChannelMergerNode::Process(float* output, int frame_count) {
	// Clear output
	ClearBuffer(output, frame_count);

	// For simplicity, merge the first N inputs into N output channels
	// Each input is treated as mono and placed into the corresponding output channel
	int inputs_to_process = std::min(static_cast<int>(inputs_.size()), channels_);

	for (int input_idx = 0; input_idx < inputs_to_process; ++input_idx) {
		if (inputs_[input_idx] && inputs_[input_idx]->IsActive()) {
			// Ensure buffer is large enough
			if (input_buffers_[input_idx].size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffers_[input_idx].resize(frame_count * channels_, 0.0f);
			}

			// Process this input
			std::memset(input_buffers_[input_idx].data(), 0, frame_count * channels_ * sizeof(float));
			inputs_[input_idx]->Process(input_buffers_[input_idx].data(), frame_count);

			// Copy first channel of input to corresponding output channel
			for (int frame = 0; frame < frame_count; ++frame) {
				output[frame * channels_ + input_idx] = input_buffers_[input_idx][frame * channels_];
			}
		}
	}
}

} // namespace webaudio
