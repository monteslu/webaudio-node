#include "audio_node.h"
#include "../utils/mixer.h"
#include <algorithm>
#include <cstring>
#include <cmath>

namespace webaudio {

AudioNode::AudioNode(int sample_rate, int channels)
	: sample_rate_(sample_rate)
	, channels_(channels)
	, is_active_(false)
	, current_time_(0.0)
	, input_buffer_(8192 * channels, 0.0f) {  // Pre-allocate large enough to avoid resize in hot path
}

void AudioNode::AddInput(AudioNode* node) {
	if (std::find(inputs_.begin(), inputs_.end(), node) == inputs_.end()) {
		inputs_.push_back(node);
	}
}

void AudioNode::AddOutput(AudioNode* node) {
	if (std::find(outputs_.begin(), outputs_.end(), node) == outputs_.end()) {
		outputs_.push_back(node);
	}
}

void AudioNode::RemoveInput(AudioNode* node) {
	inputs_.erase(std::remove(inputs_.begin(), inputs_.end(), node), inputs_.end());
}

void AudioNode::RemoveOutput(AudioNode* node) {
	outputs_.erase(std::remove(outputs_.begin(), outputs_.end(), node), outputs_.end());
}

void AudioNode::ClearOutputs() {
	outputs_.clear();
}

void AudioNode::Start(double when) {
	// Default implementation - can be overridden
	is_active_ = true;
}

void AudioNode::Stop(double when) {
	// Default implementation - can be overridden
	is_active_ = false;
}

void AudioNode::SetParameter(const std::string& name, float value) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterValue(const std::string& name, float value, double time) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration) {
	// Default implementation - override in derived classes
}

void AudioNode::CancelScheduledParameterValues(const std::string& name, double cancel_time) {
	// Default implementation - override in derived classes
}

void AudioNode::CancelAndHoldParameterAtTime(const std::string& name, double cancel_time) {
	// Default implementation - override in derived classes
}

void AudioNode::ClearBuffer(float* buffer, int frame_count) {
	std::memset(buffer, 0, frame_count * channels_ * sizeof(float));
}

void AudioNode::MixBuffer(float* dest, const float* src, int frame_count, float gain) {
	int sample_count = frame_count * channels_;
	// Use SIMD-optimized mixer (4-8x faster than scalar loop)
	Mixer::Mix(dest, src, sample_count, gain);
}

} // namespace webaudio
