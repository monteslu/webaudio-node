#ifndef WEBAUDIO_DELAY_NODE_H
#define WEBAUDIO_DELAY_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <memory>
#include <vector>

namespace webaudio {

class DelayNode : public AudioNode {
public:
	DelayNode(int sample_rate, int channels, float max_delay_time = 1.0f);
	~DelayNode() override = default;

	void Process(float* output, int frame_count) override;

	void SetParameter(const std::string& name, float value) override;

private:
	std::unique_ptr<AudioParam> delay_time_param_;
	// float max_delay_time_;  // TODO: Could be used to validate delay_time doesn't exceed max

	// Delay line per channel
	std::vector<std::vector<float>> delay_buffers_;
	std::vector<int> write_positions_;

	int max_delay_samples_;
};

} // namespace webaudio

#endif // WEBAUDIO_DELAY_NODE_H
