#ifndef WEBAUDIO_DESTINATION_NODE_H
#define WEBAUDIO_DESTINATION_NODE_H

#include "audio_node.h"

namespace webaudio {

class DestinationNode : public AudioNode {
public:
	DestinationNode(int sample_rate, int channels);
	~DestinationNode() override = default;

	void Process(float* output, int frame_count) override;
};

} // namespace webaudio

#endif // WEBAUDIO_DESTINATION_NODE_H
