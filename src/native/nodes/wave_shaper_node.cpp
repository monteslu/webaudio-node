#include "wave_shaper_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>

namespace webaudio {

WaveShaperNode::WaveShaperNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, oversample_(Oversample::NONE) {

	is_active_ = true;
}

void WaveShaperNode::SetCurve(const float* curve_data, int curve_length) {
	std::lock_guard<std::mutex> lock(curve_mutex_);
	curve_.assign(curve_data, curve_data + curve_length);
}

void WaveShaperNode::ClearCurve() {
	std::lock_guard<std::mutex> lock(curve_mutex_);
	curve_.clear();
}

float WaveShaperNode::ApplyCurve(float input) const {
	if (curve_.empty()) {
		return input; // Pass through if no curve
	}

	// Clamp input to [-1, 1]
	float clamped_input = std::max(-1.0f, std::min(1.0f, input));

	// Map input from [-1, 1] to curve index [0, curve_length - 1]
	float normalized = (clamped_input + 1.0f) / 2.0f; // [0, 1]
	float index_float = normalized * (curve_.size() - 1);

	// Linear interpolation between curve points
	int index_low = static_cast<int>(std::floor(index_float));
	int index_high = std::min(index_low + 1, static_cast<int>(curve_.size() - 1));
	float frac = index_float - index_low;

	return curve_[index_low] * (1.0f - frac) + curve_[index_high] * frac;
}

void WaveShaperNode::Process(float* output, int frame_count) {
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

	// Apply waveshaping curve
	std::lock_guard<std::mutex> lock(curve_mutex_);

	if (!curve_.empty()) {
		// TODO: Add oversampling support for X2 and X4 modes
		// For now, just apply the curve directly (no oversampling)

		for (int i = 0; i < frame_count * channels_; ++i) {
			output[i] = ApplyCurve(output[i]);
		}
	}
	// If curve is empty, output passes through unchanged
}

} // namespace webaudio
