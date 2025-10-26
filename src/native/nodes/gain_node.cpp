#include "gain_node.h"
#include <cstring>

#if defined(__ARM_NEON__)
#include <arm_neon.h>
#endif

namespace webaudio {

GainNode::GainNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, gain_param_(std::make_unique<AudioParam>(1.0f, 0.0f, 1000.0f))
	// , current_time_(0.0)  // Removed - already in base class
	{
	is_active_ = true; // Gain node is always active
	// Pre-allocate buffer
	input_buffer_.reserve(4096 * channels);
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

void GainNode::Process(float* output, int frame_count, int output_index) {
	// Cache computed channels to avoid repeated GetChannels() calls
	const int computed_channels = GetChannels();

	// Optimization: Only clear if no inputs (rare case)
	if (inputs_.empty()) {
		ClearBuffer(output, frame_count, computed_channels);
		return; // Early exit
	}

	// Fast path: single input (most common case)
	if (inputs_.size() == 1 && inputs_[0]) {
		// Process directly into output - no mixing needed!
		inputs_[0]->Process(output, frame_count);
	} else {
		// Multiple inputs - need to clear and mix
		ClearBuffer(output, frame_count, computed_channels);

		const size_t required_size = frame_count * computed_channels;
		// Pre-size buffer once (avoid repeated checks)
		if (input_buffer_.size() < required_size) {
			input_buffer_.resize(required_size, 0.0f);
		}

		for (auto* input_node : inputs_) {
			if (input_node) {
				// Process input node
				input_node->Process(input_buffer_.data(), frame_count);

				// Mix into output
				MixBuffer(output, input_buffer_.data(), frame_count, computed_channels, 1.0f);
			}
		}
	}

	// Apply gain using SIMD-optimized MixBuffer with gain parameter
	// Note: We can't use MixBuffer directly for in-place gain, so use scalar loop
	// TODO: Add dedicated SIMD gain function
	float gain = gain_param_->GetValue();

	// Fast path: gain = 1.0 means no-op
	if (gain == 1.0f) {
		return;
	}

	int sample_count = frame_count * computed_channels;

#if defined(__ARM_NEON__)
	// NEON: Process 4 samples at once
	float32x4_t gain_vec = vdupq_n_f32(gain);
	int i = 0;
	for (; i + 4 <= sample_count; i += 4) {
		float32x4_t data = vld1q_f32(&output[i]);
		data = vmulq_f32(data, gain_vec);
		vst1q_f32(&output[i], data);
	}
	// Scalar tail
	for (; i < sample_count; ++i) {
		output[i] *= gain;
	}
#else
	// Scalar fallback
	for (int i = 0; i < sample_count; ++i) {
		output[i] *= gain;
	}
#endif
}

AudioParam* GainNode::GetAudioParam(const std::string& name) {
	if (name == "gain") {
		return gain_param_.get();
	}
	return nullptr;
}

} // namespace webaudio
