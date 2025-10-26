#include "stereo_panner_node.h"
#include <cstring>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

StereoPannerNode::StereoPannerNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, pan_param_(std::make_unique<AudioParam>(0.0f, -1.0f, 1.0f)) {

	is_active_ = true;
}

void StereoPannerNode::SetParameter(const std::string& name, float value) {
	if (name == "pan") {
		pan_param_->SetValue(value);
	}
}

void StereoPannerNode::ScheduleParameterValue(const std::string& name, float value, double time) {
	if (name == "pan") {
		pan_param_->SetValueAtTime(value, time);
	}
}

void StereoPannerNode::ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential) {
	if (name == "pan") {
		if (exponential) {
			pan_param_->ExponentialRampToValueAtTime(value, time);
		} else {
			pan_param_->LinearRampToValueAtTime(value, time);
		}
	}
}

void StereoPannerNode::ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant) {
	if (name == "pan") {
		pan_param_->SetTargetAtTime(target, time, time_constant);
	}
}

void StereoPannerNode::ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration) {
	if (name == "pan") {
		pan_param_->SetValueCurveAtTime(values, time, duration);
	}
}

void StereoPannerNode::CancelScheduledParameterValues(const std::string& name, double cancel_time) {
	if (name == "pan") {
		pan_param_->CancelScheduledValues(cancel_time);
	}
}

void StereoPannerNode::CancelAndHoldParameterAtTime(const std::string& name, double cancel_time) {
	if (name == "pan") {
		pan_param_->CancelAndHoldAtTime(cancel_time);
	}
}

void StereoPannerNode::Process(float* output, int frame_count) {
	// Clear output
	ClearBuffer(output, frame_count);

	// Mix all inputs
	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffer_.resize(frame_count * channels_, 0.0f);
			}

			std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));
			input_node->Process(input_buffer_.data(), frame_count);
			MixBuffer(output, input_buffer_.data(), frame_count);
		}
	}

	// Apply panning (stereo only)
	if (channels_ == 2) {
		float pan = pan_param_->GetValue();

		// Equal power panning
		float left_gain = std::cos((pan + 1.0f) * 0.25f * M_PI);
		float right_gain = std::sin((pan + 1.0f) * 0.25f * M_PI);

		for (int frame = 0; frame < frame_count; ++frame) {
			int idx = frame * 2;
			float mono = (output[idx] + output[idx + 1]) * 0.5f;

			output[idx] = mono * left_gain;
			output[idx + 1] = mono * right_gain;
		}
	}
}

AudioParam* StereoPannerNode::GetAudioParam(const std::string& name) {
	if (name == "pan") {
		return pan_param_.get();
	}
	return nullptr;
}

} // namespace webaudio
