#include "dynamics_compressor_node.h"
#include <cstring>
#include <cmath>
#include <algorithm>

namespace webaudio {

DynamicsCompressorNode::DynamicsCompressorNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, current_gain_reduction_(1.0f)
	, current_reduction_(0.0f) {

	is_active_ = true;

	// Initialize AudioParams with Web Audio API defaults
	threshold_param_ = std::make_unique<AudioParam>(-24.0f, -100.0f, 0.0f);
	knee_param_ = std::make_unique<AudioParam>(30.0f, 0.0f, 40.0f);
	ratio_param_ = std::make_unique<AudioParam>(12.0f, 1.0f, 20.0f);
	attack_param_ = std::make_unique<AudioParam>(0.003f, 0.0f, 1.0f);
	release_param_ = std::make_unique<AudioParam>(0.25f, 0.0f, 1.0f);
}

AudioParam* DynamicsCompressorNode::GetAudioParam(const std::string& name) {
	if (name == "threshold") return threshold_param_.get();
	if (name == "knee") return knee_param_.get();
	if (name == "ratio") return ratio_param_.get();
	if (name == "attack") return attack_param_.get();
	if (name == "release") return release_param_.get();
	return nullptr;
}

float DynamicsCompressorNode::ComputeGainReduction(float input_level_db, float threshold, float knee, float ratio) {
	// Soft knee compression curve
	float overshoot = input_level_db - threshold;

	if (overshoot <= -knee / 2.0f) {
		// Below knee - no compression
		return 0.0f;
	} else if (overshoot >= knee / 2.0f) {
		// Above knee - full compression
		return overshoot * (1.0f - 1.0f / ratio);
	} else {
		// In knee - soft transition
		float x = overshoot + knee / 2.0f;
		return (x * x) / (2.0f * knee) * (1.0f - 1.0f / ratio);
	}
}

float DynamicsCompressorNode::SmoothGainChange(float current_gain, float target_gain, float attack, float release, float dt) {
	// Use attack or release time depending on direction
	float time_constant = (target_gain < current_gain) ? attack : release;

	// Avoid division by zero
	if (time_constant < 0.0001f) {
		return target_gain;
	}

	// Exponential smoothing
	float alpha = 1.0f - std::exp(-dt / time_constant);
	return current_gain + alpha * (target_gain - current_gain);
}

void DynamicsCompressorNode::Process(float* output, int frame_count) {
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

	// Get parameter values (k-rate - once per buffer)
	float threshold = threshold_param_->GetValue();
	float knee = knee_param_->GetValue();
	float ratio = ratio_param_->GetValue();
	float attack = attack_param_->GetValue();
	float release = release_param_->GetValue();

	float dt = 1.0f / sample_rate_;

	// Process compression
	for (int frame = 0; frame < frame_count; ++frame) {
		// Calculate RMS level across channels
		float sum_squares = 0.0f;
		for (int ch = 0; ch < channels_; ++ch) {
			float sample = output[frame * channels_ + ch];
			sum_squares += sample * sample;
		}
		float rms = std::sqrt(sum_squares / channels_);

		// Convert to dB (avoid log(0))
		float input_level_db = 20.0f * std::log10(std::max(rms, 1e-6f));

		// Compute desired gain reduction in dB
		float reduction_db = ComputeGainReduction(input_level_db, threshold, knee, ratio);

		// Convert to linear gain (negative reduction means attenuation)
		float target_gain = std::pow(10.0f, -reduction_db / 20.0f);

		// Smooth gain changes
		current_gain_reduction_ = SmoothGainChange(current_gain_reduction_, target_gain, attack, release, dt);

		// Update reduction for reporting (positive values)
		current_reduction_ = -20.0f * std::log10(std::max(current_gain_reduction_, 1e-6f));

		// Apply gain to all channels
		for (int ch = 0; ch < channels_; ++ch) {
			output[frame * channels_ + ch] *= current_gain_reduction_;
		}
	}
}

} // namespace webaudio
