#ifndef WEBAUDIO_BIQUAD_FILTER_NODE_H
#define WEBAUDIO_BIQUAD_FILTER_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <memory>
#include <string>

namespace webaudio {

class BiquadFilterNode : public AudioNode {
public:
	enum class FilterType {
		LOWPASS,
		HIGHPASS,
		BANDPASS,
		LOWSHELF,
		HIGHSHELF,
		PEAKING,
		NOTCH,
		ALLPASS
	};

	BiquadFilterNode(int sample_rate, int channels, const std::string& type = "lowpass");
	~BiquadFilterNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	void SetParameter(const std::string& name, float value) override;

private:
	FilterType filter_type_;
	std::unique_ptr<AudioParam> frequency_param_;
	std::unique_ptr<AudioParam> q_param_;
	std::unique_ptr<AudioParam> gain_param_;

	// Biquad coefficients (using float for speed - double precision not needed for audio)
	float b0_, b1_, b2_, a1_, a2_;

	// State variables (per channel) - float for cache efficiency
	std::vector<float> x1_, x2_, y1_, y2_;

	void UpdateCoefficients();
	FilterType StringToFilterType(const std::string& type);
};

} // namespace webaudio

#endif // WEBAUDIO_BIQUAD_FILTER_NODE_H
