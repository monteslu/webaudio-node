#include "oscillator_node.h"
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

OscillatorNode::OscillatorNode(int sample_rate, int channels, const std::string& type)
	: AudioNode(sample_rate, channels)
	, wave_type_(StringToWaveType(type))
	, frequency_param_(std::make_unique<AudioParam>(440.0f, 0.0f, 22050.0f))
	, detune_param_(std::make_unique<AudioParam>(0.0f, -4800.0f, 4800.0f))
	, phase_(0.0) {
}

OscillatorNode::WaveType OscillatorNode::StringToWaveType(const std::string& type) {
	if (type == "sine") return WaveType::SINE;
	if (type == "square") return WaveType::SQUARE;
	if (type == "sawtooth") return WaveType::SAWTOOTH;
	if (type == "triangle") return WaveType::TRIANGLE;
	return WaveType::SINE;
}

void OscillatorNode::Start(double when) {
	is_active_ = true;
	phase_ = 0.0;
}

void OscillatorNode::Stop(double when) {
	is_active_ = false;
}

void OscillatorNode::SetParameter(const std::string& name, float value) {
	if (name == "frequency") {
		frequency_param_->SetValue(value);
	} else if (name == "detune") {
		detune_param_->SetValue(value);
	} else if (name == "type") {
		wave_type_ = StringToWaveType(std::to_string(static_cast<int>(value)));
	}
}

void OscillatorNode::ScheduleParameterValue(const std::string& name, float value, double time) {
	if (name == "frequency") {
		frequency_param_->SetValueAtTime(value, time);
	} else if (name == "detune") {
		detune_param_->SetValueAtTime(value, time);
	}
}

void OscillatorNode::ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential) {
	if (name == "frequency") {
		if (exponential) {
			frequency_param_->ExponentialRampToValueAtTime(value, time);
		} else {
			frequency_param_->LinearRampToValueAtTime(value, time);
		}
	} else if (name == "detune") {
		if (exponential) {
			detune_param_->ExponentialRampToValueAtTime(value, time);
		} else {
			detune_param_->LinearRampToValueAtTime(value, time);
		}
	}
}

void OscillatorNode::ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant) {
	if (name == "frequency") {
		frequency_param_->SetTargetAtTime(target, time, time_constant);
	} else if (name == "detune") {
		detune_param_->SetTargetAtTime(target, time, time_constant);
	}
}

void OscillatorNode::ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration) {
	if (name == "frequency") {
		frequency_param_->SetValueCurveAtTime(values, time, duration);
	} else if (name == "detune") {
		detune_param_->SetValueCurveAtTime(values, time, duration);
	}
}

void OscillatorNode::CancelScheduledParameterValues(const std::string& name, double cancel_time) {
	if (name == "frequency") {
		frequency_param_->CancelScheduledValues(cancel_time);
	} else if (name == "detune") {
		detune_param_->CancelScheduledValues(cancel_time);
	}
}

void OscillatorNode::CancelAndHoldParameterAtTime(const std::string& name, double cancel_time) {
	if (name == "frequency") {
		frequency_param_->CancelAndHoldAtTime(cancel_time);
	} else if (name == "detune") {
		detune_param_->CancelAndHoldAtTime(cancel_time);
	}
}

float OscillatorNode::GenerateSample() {
	float sample = 0.0f;

	switch (wave_type_) {
		case WaveType::SINE:
			sample = std::sin(2.0 * M_PI * phase_);
			break;

		case WaveType::SQUARE:
			sample = (phase_ < 0.5) ? 1.0f : -1.0f;
			break;

		case WaveType::SAWTOOTH:
			sample = 2.0f * phase_ - 1.0f;
			break;

		case WaveType::TRIANGLE:
			if (phase_ < 0.5) {
				sample = 4.0f * phase_ - 1.0f;
			} else {
				sample = -4.0f * phase_ + 3.0f;
			}
			break;

		case WaveType::CUSTOM:
			if (!custom_wavetable_.empty()) {
				// Linear interpolation from wavetable
				double index = phase_ * custom_wavetable_.size();
				int i0 = static_cast<int>(index) % custom_wavetable_.size();
				int i1 = (i0 + 1) % custom_wavetable_.size();
				float frac = index - std::floor(index);
				sample = custom_wavetable_[i0] * (1.0f - frac) + custom_wavetable_[i1] * frac;
			}
			break;
	}

	return sample;
}

void OscillatorNode::SetPeriodicWave(const float* wavetable, int size) {
	wave_type_ = WaveType::CUSTOM;
	custom_wavetable_.assign(wavetable, wavetable + size);
}

void OscillatorNode::Process(float* output, int frame_count) {
	if (!is_active_) {
		ClearBuffer(output, frame_count);
		return;
	}

	float frequency = frequency_param_->GetValue();
	float detune = detune_param_->GetValue();

	// Apply detune (cents to frequency multiplier)
	float detune_multiplier = std::pow(2.0f, detune / 1200.0f);
	float actual_frequency = frequency * detune_multiplier;

	double phase_increment = actual_frequency / static_cast<double>(sample_rate_);

	for (int frame = 0; frame < frame_count; ++frame) {
		float sample = GenerateSample();

		// Output to all channels (mono oscillator duplicated to all channels)
		for (int ch = 0; ch < channels_; ++ch) {
			output[frame * channels_ + ch] = sample;
		}

		// Update phase
		phase_ += phase_increment;
		if (phase_ >= 1.0) {
			phase_ -= 1.0;
		}
	}
}

AudioParam* OscillatorNode::GetAudioParam(const std::string& name) {
	if (name == "frequency") {
		return frequency_param_.get();
	} else if (name == "detune") {
		return detune_param_.get();
	}
	return nullptr;
}

} // namespace webaudio
