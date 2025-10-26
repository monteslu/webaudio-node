#ifndef WEBAUDIO_STEREO_PANNER_NODE_H
#define WEBAUDIO_STEREO_PANNER_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <memory>

namespace webaudio {

class StereoPannerNode : public AudioNode {
public:
	StereoPannerNode(int sample_rate, int channels);
	~StereoPannerNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	void SetParameter(const std::string& name, float value) override;
	void ScheduleParameterValue(const std::string& name, float value, double time) override;
	void ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential) override;
	void ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant) override;
	void ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration) override;
	void CancelScheduledParameterValues(const std::string& name, double cancel_time) override;
	void CancelAndHoldParameterAtTime(const std::string& name, double cancel_time, int sample_rate) override;

	AudioParam* GetAudioParam(const std::string& name) override;

private:
	std::unique_ptr<AudioParam> pan_param_; // -1 (left) to 1 (right)
};

} // namespace webaudio

#endif // WEBAUDIO_STEREO_PANNER_NODE_H
