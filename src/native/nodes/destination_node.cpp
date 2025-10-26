#include "destination_node.h"
#include <cstring>

namespace webaudio {

DestinationNode::DestinationNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels) {
	is_active_ = true; // Destination is always active
	// Pre-allocate buffer to avoid allocations during rendering
	input_buffer_.reserve(4096 * channels); // Reserve for typical buffer size
}

void DestinationNode::Process(float* output, int frame_count, int output_index) {
	// Cache our output channels to avoid repeated GetChannels() calls
	const int output_channels = GetChannels();

	// Clear output
	ClearBuffer(output, frame_count, output_channels);

	// Mix all inputs - NOW WITH OUTPUT PORT TRACKING!
	for (const auto& conn : input_connections_) {
		if (conn.node) {
			// Ensure input buffer is large enough
			// NOTE: The input might be mono (if it's a ChannelSplitter)
			const int input_channels = conn.node->GetChannels();
			const size_t required_size = frame_count * input_channels;

			if (input_buffer_.size() < required_size) {
				input_buffer_.resize(required_size, 0.0f);
			}

			// Process input node - PASS THE OUTPUT PORT INDEX!
			// This is critical for ChannelSplitter to know which channel to extract
			conn.node->Process(input_buffer_.data(), frame_count, conn.output_index);

			// Mix into output using SIMD-optimized mixer
			// If input is mono and output is stereo, this will up-mix correctly
			MixBuffer(output, input_buffer_.data(), frame_count, input_channels, output_channels, 1.0f);
		}
	}
}

} // namespace webaudio
