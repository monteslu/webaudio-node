#include "constant_source_node.h"
#include <cstring>

namespace webaudio {

ConstantSourceNode::ConstantSourceNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, offset_param_(std::make_unique<AudioParam>(1.0f, -3.4e38f, 3.4e38f))
	, has_started_(false)
	, has_stopped_(false) {
}

void ConstantSourceNode::Start(double when) {
	has_started_ = true;
	has_stopped_ = false;
	is_active_ = true;
}

void ConstantSourceNode::Stop(double when) {
	has_stopped_ = true;
	is_active_ = false;
}

void ConstantSourceNode::Process(float* output, int frame_count) {
	if (!is_active_ || !has_started_ || has_stopped_) {
		ClearBuffer(output, frame_count);
		return;
	}

	// Get the constant value from the offset parameter
	float offset = offset_param_->GetValue();

	// Fill all channels with the constant value
	int sample_count = frame_count * channels_;
	for (int i = 0; i < sample_count; ++i) {
		output[i] = offset;
	}
}

AudioParam* ConstantSourceNode::GetAudioParam(const std::string& name) {
	if (name == "offset") {
		return offset_param_.get();
	}
	return nullptr;
}

} // namespace webaudio
