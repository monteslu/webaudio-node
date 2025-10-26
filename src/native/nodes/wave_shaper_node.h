#ifndef WEBAUDIO_WAVE_SHAPER_NODE_H
#define WEBAUDIO_WAVE_SHAPER_NODE_H

#include "audio_node.h"
#include <vector>
#include <mutex>

namespace webaudio {

class WaveShaperNode : public AudioNode {
public:
	WaveShaperNode(int sample_rate, int channels);
	~WaveShaperNode() override = default;

	void Process(float* output, int frame_count) override;

	void SetCurve(const float* curve_data, int curve_length);
	void ClearCurve();
	int GetCurveLength() const { return curve_.size(); }

	enum class Oversample {
		NONE,
		X2,
		X4
	};

	void SetOversample(Oversample oversample) { oversample_ = oversample; }
	Oversample GetOversample() const { return oversample_; }

private:
	std::vector<float> curve_;
	Oversample oversample_;
	mutable std::mutex curve_mutex_;

	float ApplyCurve(float input) const;
};

} // namespace webaudio

#endif // WEBAUDIO_WAVE_SHAPER_NODE_H
