#include "biquad_filter_node.h"
#include <cmath>
#include <cstring>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

BiquadFilterNode::BiquadFilterNode(int sample_rate, int channels, const std::string& type)
	: AudioNode(sample_rate, channels)
	, filter_type_(StringToFilterType(type))
	, frequency_param_(std::make_unique<AudioParam>(350.0f, 10.0f, sample_rate / 2.0f))
	, q_param_(std::make_unique<AudioParam>(1.0f, 0.0001f, 1000.0f))
	, gain_param_(std::make_unique<AudioParam>(0.0f, -40.0f, 40.0f))
	, b0_(1.0), b1_(0.0), b2_(0.0), a1_(0.0), a2_(0.0)
	, x1_(channels, 0.0), x2_(channels, 0.0)
	, y1_(channels, 0.0), y2_(channels, 0.0) {

	is_active_ = true;
	UpdateCoefficients();
}

BiquadFilterNode::FilterType BiquadFilterNode::StringToFilterType(const std::string& type) {
	if (type == "lowpass") return FilterType::LOWPASS;
	if (type == "highpass") return FilterType::HIGHPASS;
	if (type == "bandpass") return FilterType::BANDPASS;
	if (type == "lowshelf") return FilterType::LOWSHELF;
	if (type == "highshelf") return FilterType::HIGHSHELF;
	if (type == "peaking") return FilterType::PEAKING;
	if (type == "notch") return FilterType::NOTCH;
	if (type == "allpass") return FilterType::ALLPASS;
	return FilterType::LOWPASS;
}

void BiquadFilterNode::SetParameter(const std::string& name, float value) {
	if (name == "frequency") {
		frequency_param_->SetValue(value);
		UpdateCoefficients();
	} else if (name == "Q") {
		q_param_->SetValue(value);
		UpdateCoefficients();
	} else if (name == "gain") {
		gain_param_->SetValue(value);
		UpdateCoefficients();
	}
}

void BiquadFilterNode::UpdateCoefficients() {
	float frequency = frequency_param_->GetValue();
	float Q = q_param_->GetValue();
	// float gain = gain_param_->GetValue();  // TODO: Used for peaking, lowshelf, highshelf filters

	double omega = 2.0 * M_PI * frequency / sample_rate_;
	double sin_omega = std::sin(omega);
	double cos_omega = std::cos(omega);
	double alpha = sin_omega / (2.0 * Q);
	// double A = std::pow(10.0, gain / 40.0);  // TODO: Used for peaking, lowshelf, highshelf filters (A = 10^(gain/40))

	double a0 = 1.0;

	switch (filter_type_) {
		case FilterType::LOWPASS:
			b0_ = (1.0 - cos_omega) / 2.0;
			b1_ = 1.0 - cos_omega;
			b2_ = (1.0 - cos_omega) / 2.0;
			a0 = 1.0 + alpha;
			a1_ = -2.0 * cos_omega;
			a2_ = 1.0 - alpha;
			break;

		case FilterType::HIGHPASS:
			b0_ = (1.0 + cos_omega) / 2.0;
			b1_ = -(1.0 + cos_omega);
			b2_ = (1.0 + cos_omega) / 2.0;
			a0 = 1.0 + alpha;
			a1_ = -2.0 * cos_omega;
			a2_ = 1.0 - alpha;
			break;

		case FilterType::BANDPASS:
			b0_ = alpha;
			b1_ = 0.0;
			b2_ = -alpha;
			a0 = 1.0 + alpha;
			a1_ = -2.0 * cos_omega;
			a2_ = 1.0 - alpha;
			break;

		case FilterType::NOTCH:
			b0_ = 1.0;
			b1_ = -2.0 * cos_omega;
			b2_ = 1.0;
			a0 = 1.0 + alpha;
			a1_ = -2.0 * cos_omega;
			a2_ = 1.0 - alpha;
			break;

		default:
			// Lowpass as default
			b0_ = (1.0 - cos_omega) / 2.0;
			b1_ = 1.0 - cos_omega;
			b2_ = (1.0 - cos_omega) / 2.0;
			a0 = 1.0 + alpha;
			a1_ = -2.0 * cos_omega;
			a2_ = 1.0 - alpha;
			break;
	}

	// Normalize
	b0_ /= a0;
	b1_ /= a0;
	b2_ /= a0;
	a1_ /= a0;
	a2_ /= a0;
}

void BiquadFilterNode::Process(float* output, int frame_count) {
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

	// Apply biquad filter per channel
	for (int frame = 0; frame < frame_count; ++frame) {
		for (int ch = 0; ch < channels_; ++ch) {
			int idx = frame * channels_ + ch;
			double x0 = output[idx];

			// Biquad difference equation
			double y0 = b0_ * x0 + b1_ * x1_[ch] + b2_ * x2_[ch] - a1_ * y1_[ch] - a2_ * y2_[ch];

			// Update state
			x2_[ch] = x1_[ch];
			x1_[ch] = x0;
			y2_[ch] = y1_[ch];
			y1_[ch] = y0;

			output[idx] = static_cast<float>(y0);
		}
	}
}

} // namespace webaudio
