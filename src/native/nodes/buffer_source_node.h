#ifndef WEBAUDIO_BUFFER_SOURCE_NODE_H
#define WEBAUDIO_BUFFER_SOURCE_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <vector>
#include <memory>

namespace webaudio {

class BufferSourceNode : public AudioNode {
public:
	BufferSourceNode(int sample_rate, int channels);
	~BufferSourceNode() override = default;

	void Process(float* output, int frame_count) override;

	void SetBuffer(float* data, int length, int num_channels);
	void SetSharedBuffer(std::shared_ptr<std::vector<float>> data, int length, int num_channels);
	void Start(double when) override;
	void Stop(double when) override;

	void SetParameter(const std::string& name, float value) override;
	AudioParam* GetAudioParam(const std::string& name) override;

private:
	std::vector<float> buffer_data_;  // For old SetBuffer method
	std::shared_ptr<std::vector<float>> shared_buffer_data_;  // For new shared buffer method
	int buffer_length_;
	int buffer_channels_;
	double playback_position_;
	bool using_shared_buffer_;

	bool loop_;
	float playback_rate_;
	double loop_start_;  // in seconds
	double loop_end_;    // in seconds (0 = end of buffer)
	std::unique_ptr<AudioParam> detune_param_;

	bool has_started_;
	bool has_stopped_;
	double scheduled_start_time_;
	// double scheduled_stop_time_;  // TODO: Implement stop(when) timing
	double playback_offset_;  // offset into buffer to start playback
	// double playback_duration_;  // TODO: Implement start(when, offset, duration)
};

} // namespace webaudio

#endif // WEBAUDIO_BUFFER_SOURCE_NODE_H
