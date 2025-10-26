#include "destination_node.h"
#include <cstring>

namespace webaudio {

DestinationNode::DestinationNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels) {
	is_active_ = true; // Destination is always active
}

void DestinationNode::Process(float* output, int frame_count) {
	// Clear output
	ClearBuffer(output, frame_count);

	// Mix all inputs
	// Note: We process ALL connected nodes, not just active ones, because nodes may have
	// scheduled start times and need to be checked even before they become active
	for (auto* input_node : inputs_) {
		if (input_node) {
			// Ensure input buffer is large enough
			if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffer_.resize(frame_count * channels_, 0.0f);
			}

			// Clear input buffer
			std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));

			// Process input node (it will return silence if not active)
			input_node->Process(input_buffer_.data(), frame_count);

			// Mix into output
			MixBuffer(output, input_buffer_.data(), frame_count);
		}
	}
}

} // namespace webaudio
