#ifndef WEBAUDIO_DYNAMICS_COMPRESSOR_NODE_H
#define WEBAUDIO_DYNAMICS_COMPRESSOR_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <memory>

namespace webaudio {

class DynamicsCompressorNode : public AudioNode {
public:
	DynamicsCompressorNode(int sample_rate, int channels);
	~DynamicsCompressorNode() override = default;

	void Process(float* output, int frame_count) override;
	AudioParam* GetAudioParam(const std::string& name) override;

	float GetReduction() const { return current_reduction_; }

private:
	// AudioParams
	std::unique_ptr<AudioParam> threshold_param_;
	std::unique_ptr<AudioParam> knee_param_;
	std::unique_ptr<AudioParam> ratio_param_;
	std::unique_ptr<AudioParam> attack_param_;
	std::unique_ptr<AudioParam> release_param_;

	// State
	float current_gain_reduction_;  // Linear gain reduction (0-1)
	float current_reduction_;       // Current reduction in dB (for reporting)

	// Helper methods
	float ComputeGainReduction(float input_level_db, float threshold, float knee, float ratio);
	float SmoothGainChange(float current_gain, float target_gain, float attack, float release, float dt);
};

} // namespace webaudio

#endif // WEBAUDIO_DYNAMICS_COMPRESSOR_NODE_H
