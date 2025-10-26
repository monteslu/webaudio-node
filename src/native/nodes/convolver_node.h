#ifndef WEBAUDIO_CONVOLVER_NODE_H
#define WEBAUDIO_CONVOLVER_NODE_H

#include "audio_node.h"
#include <vector>
#include <mutex>

namespace webaudio {

class ConvolverNode : public AudioNode {
public:
	ConvolverNode(int sample_rate, int channels);
	~ConvolverNode() override = default;

	void Process(float* output, int frame_count) override;

	// Set impulse response buffer
	void SetBuffer(const float* data, int length, int num_channels);

	// Normalize property
	void SetNormalize(bool normalize) { normalize_ = normalize; }
	bool GetNormalize() const { return normalize_; }

private:
	std::vector<float> impulse_response_;  // Impulse response (interleaved if stereo)
	std::vector<float> input_history_;     // Circular buffer for input history
	std::vector<float> input_buffer_;      // Temp buffer for processing

	int impulse_length_;
	int impulse_channels_;
	int history_position_;
	bool normalize_;

	std::mutex buffer_mutex_;

	void ProcessDirect(float* output, const float* input, int frame_count);
	float ComputeNormalizationScale();
};

} // namespace webaudio

#endif // WEBAUDIO_CONVOLVER_NODE_H
