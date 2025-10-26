#include "panner_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

PannerNode::PannerNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, distance_model_("inverse")
	, ref_distance_(1.0f)
	, max_distance_(10000.0f)
	, rolloff_factor_(1.0f)
	, cone_inner_angle_(360.0f)
	, cone_outer_angle_(360.0f)
	, cone_outer_gain_(0.0f)
	, panning_model_("equalpower") {

	is_active_ = true;

	// Initialize position AudioParams (default: origin)
	position_x_param_ = std::make_unique<AudioParam>(0.0f);
	position_y_param_ = std::make_unique<AudioParam>(0.0f);
	position_z_param_ = std::make_unique<AudioParam>(0.0f);

	// Initialize orientation AudioParams (default: looking in +X direction)
	orientation_x_param_ = std::make_unique<AudioParam>(1.0f);
	orientation_y_param_ = std::make_unique<AudioParam>(0.0f);
	orientation_z_param_ = std::make_unique<AudioParam>(0.0f);
}

AudioParam* PannerNode::GetAudioParam(const std::string& name) {
	if (name == "positionX") return position_x_param_.get();
	if (name == "positionY") return position_y_param_.get();
	if (name == "positionZ") return position_z_param_.get();
	if (name == "orientationX") return orientation_x_param_.get();
	if (name == "orientationY") return orientation_y_param_.get();
	if (name == "orientationZ") return orientation_z_param_.get();
	return nullptr;
}

void PannerNode::SetDistanceModel(const std::string& model) {
	if (model == "linear" || model == "inverse" || model == "exponential") {
		distance_model_ = model;
	}
}

void PannerNode::SetPanningModel(const std::string& model) {
	if (model == "equalpower" || model == "HRTF") {
		panning_model_ = model;
	}
}

float PannerNode::ComputeDistanceGain(float distance) {
	// Clamp distance to valid range
	distance = std::max(0.0f, distance);

	if (distance_model_ == "linear") {
		// Linear distance model
		if (distance >= max_distance_) {
			return 0.0f;
		}
		float gain = 1.0f - rolloff_factor_ * (distance - ref_distance_) / (max_distance_ - ref_distance_);
		return std::max(0.0f, std::min(1.0f, gain));

	} else if (distance_model_ == "inverse") {
		// Inverse distance model (default)
		return ref_distance_ / (ref_distance_ + rolloff_factor_ * (std::max(distance, ref_distance_) - ref_distance_));

	} else if (distance_model_ == "exponential") {
		// Exponential distance model
		return std::pow(std::max(distance, ref_distance_) / ref_distance_, -rolloff_factor_);
	}

	return 1.0f;
}

float PannerNode::ComputeConeGain(float dx, float dy, float dz) {
	// If cone angles are 360, no cone effect
	if (cone_inner_angle_ >= 360.0f && cone_outer_angle_ >= 360.0f) {
		return 1.0f;
	}

	// Normalize direction to listener
	float distance = std::sqrt(dx * dx + dy * dy + dz * dz);
	if (distance < 0.0001f) {
		return 1.0f; // At listener position
	}

	float dir_x = -dx / distance;
	float dir_y = -dy / distance;
	float dir_z = -dz / distance;

	// Get orientation from AudioParams
	float orientation_x = orientation_x_param_->GetValue();
	float orientation_y = orientation_y_param_->GetValue();
	float orientation_z = orientation_z_param_->GetValue();

	// Normalize orientation
	float orient_len = std::sqrt(orientation_x * orientation_x +
	                             orientation_y * orientation_y +
	                             orientation_z * orientation_z);
	if (orient_len < 0.0001f) {
		return 1.0f; // No orientation
	}

	float norm_orient_x = orientation_x / orient_len;
	float norm_orient_y = orientation_y / orient_len;
	float norm_orient_z = orientation_z / orient_len;

	// Dot product gives cosine of angle
	float dot = dir_x * norm_orient_x + dir_y * norm_orient_y + dir_z * norm_orient_z;
	float angle = std::acos(std::max(-1.0f, std::min(1.0f, dot))) * 180.0f / static_cast<float>(M_PI);

	// Compute cone gain based on angle
	if (angle <= cone_inner_angle_ / 2.0f) {
		return 1.0f; // Inside inner cone
	} else if (angle >= cone_outer_angle_ / 2.0f) {
		return cone_outer_gain_; // Outside outer cone
	} else {
		// Linear interpolation between inner and outer
		float inner_half = cone_inner_angle_ / 2.0f;
		float outer_half = cone_outer_angle_ / 2.0f;
		float t = (angle - inner_half) / (outer_half - inner_half);
		return 1.0f + t * (cone_outer_gain_ - 1.0f);
	}
}

void PannerNode::ApplyEqualPowerPanning(float* output, const float* input, int frame_count,
                                         float dx, float dy, float dz) {
	// Compute azimuth angle (horizontal angle)
	// Listener faces -Z, X is right, Y is up
	float azimuth = std::atan2(dx, -dz);  // Angle in XZ plane

	// Equal power panning: pan from -90° to +90°
	// Clamp to ±90°
	float half_pi = static_cast<float>(M_PI) / 2.0f;
	azimuth = std::max(-half_pi, std::min(half_pi, azimuth));

	// Convert to pan position: -1 (left) to +1 (right)
	float pan = azimuth / half_pi;

	// Equal power pan law
	float pi_f = static_cast<float>(M_PI);
	float left_gain = std::cos((pan + 1.0f) * pi_f / 4.0f);
	float right_gain = std::sin((pan + 1.0f) * pi_f / 4.0f);

	// Mix input to stereo output
	if (channels_ == 2) {
		for (int i = 0; i < frame_count; ++i) {
			// If input is mono, duplicate to both channels
			float mono_sample = input[i * 2] + input[i * 2 + 1];
			mono_sample *= 0.5f; // Average channels

			output[i * 2] += mono_sample * left_gain;
			output[i * 2 + 1] += mono_sample * right_gain;
		}
	} else {
		// Mono output - just copy
		for (int i = 0; i < frame_count; ++i) {
			output[i] += input[i];
		}
	}
}

void PannerNode::Process(float* output, int frame_count, int output_index) {
	// Clear output
	ClearBuffer(output, frame_count);

	// Get position from AudioParams
	float dx = position_x_param_->GetValue();
	float dy = position_y_param_->GetValue();
	float dz = position_z_param_->GetValue();

	// Compute distance from listener (always at origin)
	float distance = std::sqrt(dx * dx + dy * dy + dz * dz);

	// Compute gains
	float distance_gain = ComputeDistanceGain(distance);
	float cone_gain = ComputeConeGain(dx, dy, dz);
	float total_gain = distance_gain * cone_gain;

	// Process all inputs
	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffer_.resize(frame_count * channels_, 0.0f);
			}

			std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));
			input_node->Process(input_buffer_.data(), frame_count);

			// Apply distance and cone gain
			for (int i = 0; i < frame_count * channels_; ++i) {
				input_buffer_[i] *= total_gain;
			}

			// Apply panning
			if (panning_model_ == "equalpower") {
				ApplyEqualPowerPanning(output, input_buffer_.data(), frame_count, dx, dy, dz);
			} else {
				// HRTF not implemented - fall back to simple mix
				MixBuffer(output, input_buffer_.data(), frame_count);
			}
		}
	}
}

} // namespace webaudio
