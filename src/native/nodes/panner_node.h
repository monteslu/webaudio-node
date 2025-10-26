#ifndef WEBAUDIO_PANNER_NODE_H
#define WEBAUDIO_PANNER_NODE_H

#include "audio_node.h"
#include <string>
#include <cmath>

namespace webaudio {

class PannerNode : public AudioNode {
public:
	PannerNode(int sample_rate, int channels);
	~PannerNode() override = default;

	void Process(float* output, int frame_count) override;

	// Position
	void SetPositionX(float x) { position_x_ = x; }
	void SetPositionY(float y) { position_y_ = y; }
	void SetPositionZ(float z) { position_z_ = z; }
	float GetPositionX() const { return position_x_; }
	float GetPositionY() const { return position_y_; }
	float GetPositionZ() const { return position_z_; }

	// Orientation
	void SetOrientationX(float x) { orientation_x_ = x; }
	void SetOrientationY(float y) { orientation_y_ = y; }
	void SetOrientationZ(float z) { orientation_z_ = z; }

	// Distance model
	void SetDistanceModel(const std::string& model);
	void SetRefDistance(float distance) { ref_distance_ = distance; }
	void SetMaxDistance(float distance) { max_distance_ = distance; }
	void SetRolloffFactor(float factor) { rolloff_factor_ = factor; }

	// Cone
	void SetConeInnerAngle(float angle) { cone_inner_angle_ = angle; }
	void SetConeOuterAngle(float angle) { cone_outer_angle_ = angle; }
	void SetConeOuterGain(float gain) { cone_outer_gain_ = gain; }

	// Panning model
	void SetPanningModel(const std::string& model);

private:
	// Listener is always at (0, 0, 0) looking down -Z axis
	float position_x_, position_y_, position_z_;
	float orientation_x_, orientation_y_, orientation_z_;

	std::string distance_model_;  // "linear", "inverse", "exponential"
	float ref_distance_;
	float max_distance_;
	float rolloff_factor_;

	float cone_inner_angle_;
	float cone_outer_angle_;
	float cone_outer_gain_;

	std::string panning_model_;  // "equalpower", "HRTF"

	std::vector<float> input_buffer_;

	float ComputeDistanceGain(float distance);
	float ComputeConeGain(float distance_x, float distance_y, float distance_z);
	void ApplyEqualPowerPanning(float* output, const float* input, int frame_count,
	                             float distance_x, float distance_y, float distance_z);
};

} // namespace webaudio

#endif // WEBAUDIO_PANNER_NODE_H
