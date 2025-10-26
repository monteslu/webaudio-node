#ifndef WEBAUDIO_MEDIA_STREAM_SOURCE_NODE_H
#define WEBAUDIO_MEDIA_STREAM_SOURCE_NODE_H

#include "audio_node.h"
#include <vector>
#include <mutex>

namespace webaudio {

// MediaStreamSourceNode - Captures audio from input device (microphone)
class MediaStreamSourceNode : public AudioNode {
public:
	MediaStreamSourceNode(int sample_rate, int channels);
	~MediaStreamSourceNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	// Called by audio capture callback to feed data
	void FeedAudioData(const float* data, int frame_count);

	// Check if buffer has data available
	bool HasData() const;

private:
	// Ring buffer for captured audio
	std::vector<float> ring_buffer_;
	size_t write_pos_;
	size_t read_pos_;
	size_t buffer_size_;

	mutable std::mutex buffer_mutex_;
};

} // namespace webaudio

#endif // WEBAUDIO_MEDIA_STREAM_SOURCE_NODE_H
