#ifndef WEBAUDIO_CHANNEL_SPLITTER_NODE_H
#define WEBAUDIO_CHANNEL_SPLITTER_NODE_H

#include "audio_node.h"
#include <vector>
#include <map>

namespace webaudio {

class ChannelSplitterNode : public AudioNode {
public:
	ChannelSplitterNode(int sample_rate, int channels, int number_of_outputs);
	~ChannelSplitterNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	// CRITICAL: Override GetChannels() to always return MONO (1 channel)!
	// Per spec, each output is mono regardless of input channel count
	int GetChannels() const override { return 1; }

	// Channel routing: maps output node -> which channel it should receive
	void SetOutputChannelMapping(AudioNode* output_node, int channel_index);
	int GetOutputChannelForNode(AudioNode* output_node) const;

private:
	int number_of_outputs_;
	int input_channels_;  // Actual channel count of input (may be stereo)
	std::vector<std::vector<float>> output_buffers_;

	// Maps output nodes to their requested channel index
	std::map<AudioNode*, int> output_channel_map_;

	// Buffer to hold processed input
	std::vector<float> input_buffer_;

	// Cache to avoid re-processing inputs multiple times per render quantum
	int last_frame_count_;
	bool input_cached_;
};

} // namespace webaudio

#endif // WEBAUDIO_CHANNEL_SPLITTER_NODE_H
