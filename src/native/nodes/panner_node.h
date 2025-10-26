#ifndef WEBAUDIO_PANNER_NODE_H
#define WEBAUDIO_PANNER_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <string>
#include <cmath>
#include <memory>

namespace webaudio {

class PannerNode : public AudioNode {
public:
	PannerNode(int sample_rate, int channels);
	~PannerNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	// AudioParam getters (Web Audio API spec)
	AudioParam* GetAudioParam(const std::string& name) override;

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
	// Position and orientation as AudioParams (Web Audio API spec)
	std::unique_ptr<AudioParam> position_x_param_;
	std::unique_ptr<AudioParam> position_y_param_;
	std::unique_ptr<AudioParam> position_z_param_;
	std::unique_ptr<AudioParam> orientation_x_param_;
	std::unique_ptr<AudioParam> orientation_y_param_;
	std::unique_ptr<AudioParam> orientation_z_param_;

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
