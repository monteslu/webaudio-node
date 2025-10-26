#ifndef WEBAUDIO_AUDIO_NODE_H
#define WEBAUDIO_AUDIO_NODE_H

#include <vector>
#include <string>
#include <memory>
#include "../audio_param.h"

namespace webaudio {

class AudioNode {
public:
	AudioNode(int sample_rate, int channels);
	virtual ~AudioNode() = default;

	// Processing
	virtual void Process(float* output, int frame_count, int output_index = 0) = 0;

	// Connection management - now with output/input port tracking
	struct InputConnection {
		AudioNode* node;
		int output_index;  // Which output port of the source node
		int input_index;   // Which input port of this node
	};

	void AddInput(AudioNode* node, int output_index = 0, int input_index = 0);
	void AddOutput(AudioNode* node);
	void RemoveInput(AudioNode* node);
	void RemoveOutput(AudioNode* node);
	void ClearOutputs();

	// Control
	virtual void Start(double when);
	virtual void Stop(double when);
	virtual void SetParameter(const std::string& name, float value);
	virtual void ScheduleParameterValue(const std::string& name, float value, double time);
	virtual void ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential);
	virtual void ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant);
	virtual void ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration);
	virtual void CancelScheduledParameterValues(const std::string& name, double cancel_time);
	virtual void CancelAndHoldParameterAtTime(const std::string& name, double cancel_time, int sample_rate);

	// State
	bool IsActive() const { return is_active_; }
	int GetSampleRate() const { return sample_rate_; }
	virtual int GetChannels() const;  // Returns computed channel count based on inputs (per spec!)

	// Time
	void SetCurrentTime(double time) { current_time_ = time; }
	double GetCurrentTime() const { return current_time_; }

	// AudioParam access (for modulation)
	virtual AudioParam* GetAudioParam(const std::string& name) { return nullptr; }

	// Buffer management
	void ClearBuffer(float* buffer, int frame_count);
	void ClearBuffer(float* buffer, int frame_count, int channels);  // Optimized version with pre-computed channels
	void MixBuffer(float* dest, const float* src, int frame_count, float gain = 1.0f);
	void MixBuffer(float* dest, const float* src, int frame_count, int channels, float gain);  // Optimized version with pre-computed channels
	void MixBuffer(float* dest, const float* src, int frame_count, int input_channels, int output_channels, float gain);  // With channel conversion

protected:
	int sample_rate_;
	int channels_;
	bool is_active_;
	double current_time_;

	std::vector<InputConnection> input_connections_;  // Changed from raw pointers
	std::vector<AudioNode*> outputs_;

	// Backward compatibility - maintain inputs_ as pointers for nodes that don't use port info yet
	std::vector<AudioNode*> inputs_;

	// Scratch buffer for mixing inputs
	// Note: Consider pre-allocating this to reduce dynamic allocations
	std::vector<float> input_buffer_;

	// Cached computed channel count (to avoid O(N^2) recursive GetChannels() calls)
	mutable int cached_channels_;
	mutable bool channels_cache_valid_;
};

} // namespace webaudio

#endif // WEBAUDIO_AUDIO_NODE_H
