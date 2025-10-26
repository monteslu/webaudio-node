#ifndef WEBAUDIO_CHANNEL_MERGER_NODE_H
#define WEBAUDIO_CHANNEL_MERGER_NODE_H

#include "audio_node.h"
#include <vector>
#include <map>

namespace webaudio {

// Forward declaration
class ChannelSplitterNode;

class ChannelMergerNode : public AudioNode {
public:
	ChannelMergerNode(int sample_rate, int channels, int number_of_inputs);
	~ChannelMergerNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	// Channel routing: maps input node -> which output channel it should write to
	void SetInputChannelMapping(AudioNode* input_node, int channel_index);
	int GetInputChannelForNode(AudioNode* input_node) const;

private:
	int number_of_inputs_;
	std::vector<std::vector<float>> input_buffers_;

	// Maps input nodes to their target output channel index
	std::map<AudioNode*, int> input_channel_map_;

	// Cache of which inputs are splitters (to avoid repeated dynamic_cast)
	std::map<AudioNode*, ChannelSplitterNode*> splitter_cache_;
};

} // namespace webaudio

#endif // WEBAUDIO_CHANNEL_MERGER_NODE_H
