#ifndef WEBAUDIO_CONSTANT_SOURCE_NODE_H
#define WEBAUDIO_CONSTANT_SOURCE_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <memory>

namespace webaudio {

class ConstantSourceNode : public AudioNode {
public:
	ConstantSourceNode(int sample_rate, int channels);
	~ConstantSourceNode() override = default;

	void Process(float* output, int frame_count) override;

	void Start(double when) override;
	void Stop(double when) override;

	AudioParam* GetAudioParam(const std::string& name) override;

private:
	std::unique_ptr<AudioParam> offset_param_;
	bool has_started_;
	bool has_stopped_;
};

} // namespace webaudio

#endif // WEBAUDIO_CONSTANT_SOURCE_NODE_H
