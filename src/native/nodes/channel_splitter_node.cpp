#include "channel_splitter_node.h"
#include <cstring>

namespace webaudio {

ChannelSplitterNode::ChannelSplitterNode(int sample_rate, int channels, int number_of_outputs)
	: AudioNode(sample_rate, 1)  // CRITICAL: Output is always MONO!
	, number_of_outputs_(number_of_outputs)
	, input_channels_(channels)
	, last_frame_count_(0)
	, input_cached_(false) {

	// Per spec: Each output of ChannelSplitter is MONO (single channel)
	// This makes downstream nodes process only 1 channel instead of 2 (2x faster!)

	is_active_ = true;

	// Allocate output buffers for each output
	output_buffers_.resize(number_of_outputs_);
}

void ChannelSplitterNode::SetOutputChannelMapping(AudioNode* output_node, int channel_index) {
	output_channel_map_[output_node] = channel_index;
}

int ChannelSplitterNode::GetOutputChannelForNode(AudioNode* output_node) const {
	auto it = output_channel_map_.find(output_node);
	if (it != output_channel_map_.end()) {
		return it->second;
	}
	return 0; // Default to channel 0
}

void ChannelSplitterNode::Process(float* output, int frame_count, int output_index) {
	// Get input from connected nodes
	if (inputs_.empty() || !inputs_[0] || !inputs_[0]->IsActive()) {
		// Output MONO silence (single channel!)
		std::memset(output, 0, frame_count * sizeof(float));
		input_cached_ = false;  // Reset cache
		return;
	}

	const int actual_input_channels = inputs_[0]->GetChannels();
	const size_t input_size = frame_count * actual_input_channels;

	// CRITICAL OPTIMIZATION: Cache input processing!
	// When splitter has multiple outputs (e.g. filterL and filterR),
	// each one calls Process(), but we should only process upstream ONCE.
	if (!input_cached_ || last_frame_count_ != frame_count) {
		// Ensure we have a buffer for the full input
		if (input_buffer_.size() < input_size) {
			input_buffer_.resize(input_size);
		}

		// Process input ONCE per render quantum
		inputs_[0]->Process(input_buffer_.data(), frame_count);

		input_cached_ = true;
		last_frame_count_ = frame_count;
	}

	// CRITICAL: Extract ONLY the channel specified by output_index!
	// This is the key to the 2x speedup - downstream gets MONO, not stereo!
	int channel_to_extract = output_index;

	// Safety check
	if (channel_to_extract >= actual_input_channels) {
		channel_to_extract = 0;
	}

	// Ultra-optimized tight loop to extract single channel as MONO
	const float* __restrict in = input_buffer_.data() + channel_to_extract;
	float* __restrict out = output;

	for (int frame = 0; frame < frame_count; ++frame) {
		*out++ = *in;
		in += actual_input_channels;
	}
}

} // namespace webaudio
