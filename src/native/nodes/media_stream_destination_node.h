#ifndef WEBAUDIO_MEDIA_STREAM_DESTINATION_NODE_H
#define WEBAUDIO_MEDIA_STREAM_DESTINATION_NODE_H

#include "audio_node.h"
#include <vector>
#include <mutex>

namespace webaudio {

class MediaStreamDestinationNode : public AudioNode {
public:
	MediaStreamDestinationNode(int sample_rate, int channels);
	~MediaStreamDestinationNode() override = default;

	void Process(float* output, int frame_count) override;

	// Note: In browser, this would create a MediaStream
	// For Node.js, we just pass through and could potentially capture data

private:
	std::vector<float> input_buffer_;
};

} // namespace webaudio

#endif // WEBAUDIO_MEDIA_STREAM_DESTINATION_NODE_H
