#include "channel_splitter_node.h"
#include <cstring>

namespace webaudio {

ChannelSplitterNode::ChannelSplitterNode(int sample_rate, int channels, int number_of_outputs)
	: AudioNode(sample_rate, channels)
	, number_of_outputs_(number_of_outputs) {

	is_active_ = true;

	// Allocate output buffers for each output
	output_buffers_.resize(number_of_outputs_);
}

void ChannelSplitterNode::Process(float* output, int frame_count) {
	// Clear output
	ClearBuffer(output, frame_count);

	// Get input from connected nodes
	if (inputs_.empty() || !inputs_[0] || !inputs_[0]->IsActive()) {
		return;
	}

	// Allocate input buffer
	if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
		input_buffer_.resize(frame_count * channels_, 0.0f);
	}

	// Process input
	std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));
	inputs_[0]->Process(input_buffer_.data(), frame_count);

	// Split channels: extract each input channel to separate output
	// Note: In the Web Audio API, ChannelSplitterNode outputs are accessed
	// via different output indices in connect(), not in this Process() call.
	// For now, we'll just pass through the input as-is.
	// The actual channel splitting logic should be handled in the graph connection logic.

	// For the default case, just copy input to output
	std::memcpy(output, input_buffer_.data(), frame_count * channels_ * sizeof(float));
}

} // namespace webaudio
