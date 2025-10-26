#ifndef WEBAUDIO_CHANNEL_MERGER_NODE_H
#define WEBAUDIO_CHANNEL_MERGER_NODE_H

#include "audio_node.h"
#include <vector>

namespace webaudio {

class ChannelMergerNode : public AudioNode {
public:
	ChannelMergerNode(int sample_rate, int channels, int number_of_inputs);
	~ChannelMergerNode() override = default;

	void Process(float* output, int frame_count) override;

private:
	int number_of_inputs_;
	std::vector<std::vector<float>> input_buffers_;
};

} // namespace webaudio

#endif // WEBAUDIO_CHANNEL_MERGER_NODE_H
