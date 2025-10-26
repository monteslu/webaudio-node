#include "channel_merger_node.h"
#include "channel_splitter_node.h"
#include <cstring>
#include <algorithm>

#if defined(__ARM_NEON__)
#include <arm_neon.h>
#endif

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

void ChannelMergerNode::SetInputChannelMapping(AudioNode* input_node, int channel_index) {
	input_channel_map_[input_node] = channel_index;
}

int ChannelMergerNode::GetInputChannelForNode(AudioNode* input_node) const {
	auto it = input_channel_map_.find(input_node);
	if (it != input_channel_map_.end()) {
		return it->second;
	}
	return 0; // Default to channel 0
}

void ChannelMergerNode::Process(float* output, int frame_count, int output_index) {
	// Clear output
	ClearBuffer(output, frame_count);

	// Process each input and place it in the correct output channel
	// NOW USING INPUT_CONNECTIONS TO GET OUTPUT PORT INDEX!
	for (size_t idx = 0; idx < input_connections_.size(); ++idx) {
		const auto& conn = input_connections_[idx];
		if (!conn.node || !conn.node->IsActive()) {
			continue;
		}

		// The target output channel is the input_index from the connection
		int target_channel = conn.input_index;
		if (target_channel >= channels_) {
			target_channel = 0; // Safety check
		}

		const int input_channels = conn.node->GetChannels();
		const size_t input_size = frame_count * input_channels;

		// Ensure buffer capacity
		if (idx >= input_buffers_.size()) {
			input_buffers_.resize(idx + 1);
		}
		if (input_buffers_[idx].capacity() < input_size) {
			input_buffers_[idx].reserve(input_size * 2);
		}
		if (input_buffers_[idx].size() < input_size) {
			input_buffers_[idx].resize(input_size);
		}

		// Process this input - PASS OUTPUT PORT INDEX!
		// For ChannelSplitter, this tells it which channel to extract
		conn.node->Process(input_buffers_[idx].data(), frame_count, conn.output_index);

		// Now the input is MONO (if from ChannelSplitter), so just copy it!
		// Ultra-optimized tight loop
		const float* __restrict in = input_buffers_[idx].data();
		float* __restrict out = output + target_channel;
		const int in_stride = input_channels;
		const int out_stride = channels_;

		if (input_channels == 1) {
			// MONO input (from ChannelSplitter) - simple copy
			for (int frame = 0; frame < frame_count; ++frame) {
				*out = *in++;
				out += out_stride;
			}
		} else {
			// Stereo input - extract first channel
			for (int frame = 0; frame < frame_count; ++frame) {
				*out = *in;
				in += in_stride;
				out += out_stride;
			}
		}
	}
}

} // namespace webaudio
