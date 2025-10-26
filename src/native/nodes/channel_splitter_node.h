#ifndef WEBAUDIO_CHANNEL_SPLITTER_NODE_H
#define WEBAUDIO_CHANNEL_SPLITTER_NODE_H

#include "audio_node.h"
#include <vector>

namespace webaudio {

class ChannelSplitterNode : public AudioNode {
public:
	ChannelSplitterNode(int sample_rate, int channels, int number_of_outputs);
	~ChannelSplitterNode() override = default;

	void Process(float* output, int frame_count) override;

private:
	int number_of_outputs_;
	std::vector<std::vector<float>> output_buffers_;
};

} // namespace webaudio

#endif // WEBAUDIO_CHANNEL_SPLITTER_NODE_H
