#ifndef WEBAUDIO_IIR_FILTER_NODE_H
#define WEBAUDIO_IIR_FILTER_NODE_H

#include "audio_node.h"
#include <vector>
#include <mutex>

namespace webaudio {

class IIRFilterNode : public AudioNode {
public:
	IIRFilterNode(int sample_rate, int channels,
	              const std::vector<float>& feedforward,
	              const std::vector<float>& feedback);
	~IIRFilterNode() override = default;

	void Process(float* output, int frame_count) override;

	void GetFrequencyResponse(const float* frequency_hz, float* mag_response,
	                          float* phase_response, int array_length) const;

private:
	std::vector<float> feedforward_;  // b coefficients (numerator)
	std::vector<float> feedback_;     // a coefficients (denominator)

	// Delay lines per channel
	std::vector<std::vector<float>> x_history_;  // Input history [channel][sample]
	std::vector<std::vector<float>> y_history_;  // Output history [channel][sample]

	mutable std::mutex filter_mutex_;
};

} // namespace webaudio

#endif // WEBAUDIO_IIR_FILTER_NODE_H
