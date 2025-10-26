#ifndef WEBAUDIO_AUDIO_WORKLET_NODE_H
#define WEBAUDIO_AUDIO_WORKLET_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <memory>
#include <map>
#include <string>
#include <vector>
#include <functional>

namespace webaudio {

// Simplified AudioWorkletNode implementation
// Allows custom audio processing via JavaScript callback
class AudioWorkletNode : public AudioNode {
public:
	AudioWorkletNode(int sample_rate, int channels, const std::string& processor_name);
	~AudioWorkletNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	// Parameter management
	void AddParameter(const std::string& name, float default_value, float min_value, float max_value);
	AudioParam* GetAudioParam(const std::string& name) override;

	// Processing callback (set from JavaScript)
	using ProcessCallback = std::function<void(
		const std::vector<const float*>& inputs,   // Input buffers (one per input)
		const std::vector<float*>& outputs,        // Output buffers (one per output)
		const std::map<std::string, float>& params, // Parameter values
		int frame_count
	)>;

	void SetProcessCallback(ProcessCallback callback) {
		process_callback_ = callback;
	}

	const std::string& GetProcessorName() const { return processor_name_; }

private:
	std::string processor_name_;
	std::map<std::string, std::unique_ptr<AudioParam>> parameters_;
	ProcessCallback process_callback_;

	// Buffers for passing to callback
	std::vector<const float*> input_ptrs_;
	std::vector<float*> output_ptrs_;
	std::vector<float> input_buffer_;
	std::vector<float> output_buffer_;
};

} // namespace webaudio

#endif // WEBAUDIO_AUDIO_WORKLET_NODE_H
