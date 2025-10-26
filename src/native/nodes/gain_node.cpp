#include "gain_node.h"
#include <cstring>

namespace webaudio {

GainNode::GainNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, gain_param_(std::make_unique<AudioParam>(1.0f, 0.0f, 1000.0f))
	// , current_time_(0.0)  // Removed - already in base class
	{
	is_active_ = true; // Gain node is always active
}

void GainNode::SetParameter(const std::string& name, float value) {
	if (name == "gain") {
		gain_param_->SetValue(value);
	}
}

void GainNode::ScheduleParameterValue(const std::string& name, float value, double time) {
	if (name == "gain") {
		gain_param_->SetValueAtTime(value, time);
	}
}

void GainNode::ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential) {
	if (name == "gain") {
		if (exponential) {
			gain_param_->ExponentialRampToValueAtTime(value, time);
		} else {
			gain_param_->LinearRampToValueAtTime(value, time);
		}
	}
}

void GainNode::ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant) {
	if (name == "gain") {
		gain_param_->SetTargetAtTime(target, time, time_constant);
	}
}

void GainNode::ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration) {
	if (name == "gain") {
		gain_param_->SetValueCurveAtTime(values, time, duration);
	}
}

void GainNode::CancelScheduledParameterValues(const std::string& name, double cancel_time) {
	if (name == "gain") {
		gain_param_->CancelScheduledValues(cancel_time);
	}
}

void GainNode::CancelAndHoldParameterAtTime(const std::string& name, double cancel_time, int sample_rate) {
	if (name == "gain") {
		gain_param_->CancelAndHoldAtTime(cancel_time, sample_rate);
	}
}

void GainNode::Process(float* output, int frame_count) {
	// Clear output
	ClearBuffer(output, frame_count);

	// Mix all inputs
	// Note: Process all nodes, not just active ones, to support scheduled starts
	for (auto* input_node : inputs_) {
		if (input_node) {
			// Ensure input buffer is large enough
			if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffer_.resize(frame_count * channels_, 0.0f);
			}

			// Clear input buffer
			std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));

			// Process input node
			input_node->Process(input_buffer_.data(), frame_count);

			// Mix into output
			MixBuffer(output, input_buffer_.data(), frame_count);
		}
	}

	// Apply gain
	float gain = gain_param_->GetValue();
	int sample_count = frame_count * channels_;
	for (int i = 0; i < sample_count; ++i) {
		output[i] *= gain;
	}
}

AudioParam* GainNode::GetAudioParam(const std::string& name) {
	if (name == "gain") {
		return gain_param_.get();
	}
	return nullptr;
}

} // namespace webaudio
