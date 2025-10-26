#include "audio_worklet_node.h"
#include <cstring>
#include <algorithm>
#include <iostream>

namespace webaudio {

AudioWorkletNode::AudioWorkletNode(int sample_rate, int channels, const std::string& processor_name)
	: AudioNode(sample_rate, channels)
	, processor_name_(processor_name)
	, process_callback_(nullptr) {

	is_active_ = true;

	// Pre-allocate output buffer
	output_buffer_.resize(4096 * channels, 0.0f);
}

void AudioWorkletNode::Process(float* output, int frame_count) {
	int sample_count = frame_count * channels_;

	// Ensure output buffer is large enough
	if (output_buffer_.size() < static_cast<size_t>(sample_count)) {
		output_buffer_.resize(sample_count, 0.0f);
	}

	// Clear output
	std::fill(output_buffer_.begin(), output_buffer_.begin() + sample_count, 0.0f);

	// Prepare input buffers (mix all inputs)
	if (input_buffer_.size() < static_cast<size_t>(sample_count)) {
		input_buffer_.resize(sample_count, 0.0f);
	}
	std::fill(input_buffer_.begin(), input_buffer_.begin() + sample_count, 0.0f);

	for (auto* input_node : inputs_) {
		if (input_node) {
			std::vector<float> temp_buffer(sample_count, 0.0f);
			input_node->Process(temp_buffer.data(), frame_count);
			for (int i = 0; i < sample_count; ++i) {
				input_buffer_[i] += temp_buffer[i];
			}
		}
	}

	// Call JavaScript process callback if set
	if (process_callback_) {
		// Prepare input/output pointers
		input_ptrs_.clear();
		output_ptrs_.clear();

		input_ptrs_.push_back(input_buffer_.data());
		output_ptrs_.push_back(output_buffer_.data());

		// Get current parameter values
		std::map<std::string, float> param_values;
		for (const auto& pair : parameters_) {
			param_values[pair.first] = pair.second->GetValue();
		}

		// Call the JavaScript processor
		process_callback_(input_ptrs_, output_ptrs_, param_values, frame_count);
	}

	// Copy processed output
	std::copy(output_buffer_.begin(), output_buffer_.begin() + sample_count, output);
}

void AudioWorkletNode::AddParameter(const std::string& name, float default_value, float min_value, float max_value) {
	parameters_[name] = std::make_unique<AudioParam>(default_value, min_value, max_value);
}

AudioParam* AudioWorkletNode::GetAudioParam(const std::string& name) {
	auto it = parameters_.find(name);
	if (it != parameters_.end()) {
		return it->second.get();
	}
	return nullptr;
}

} // namespace webaudio
