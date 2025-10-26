#ifndef WEBAUDIO_AUDIO_PARAM_H
#define WEBAUDIO_AUDIO_PARAM_H

#include <vector>
#include <mutex>

namespace webaudio {

struct AutomationEvent {
	enum class Type {
		SET_VALUE,
		LINEAR_RAMP,
		EXPONENTIAL_RAMP,
		SET_TARGET,
		SET_CURVE
	};

	Type type;
	double time;
	float value;
	double time_constant; // for SET_TARGET
	double duration; // for SET_CURVE
	std::vector<float> curve_values; // for SET_CURVE
};

class AudioParam {
public:
	AudioParam(float default_value, float min_value = -3.4e38f, float max_value = 3.4e38f);
	~AudioParam() = default;

	// Immediate value setting
	void SetValue(float value);
	float GetValue() const;

	// Automation scheduling (may throw std::invalid_argument or std::range_error for invalid parameters)
	void SetValueAtTime(float value, double time);
	void LinearRampToValueAtTime(float value, double time);
	void ExponentialRampToValueAtTime(float value, double time);
	void SetTargetAtTime(float target, double time, double time_constant);
	void SetValueCurveAtTime(const std::vector<float>& values, double time, double duration);
	void CancelScheduledValues(double cancel_time);
	void CancelAndHoldAtTime(double cancel_time, int sample_rate);

	// Get computed value at specific time
	float GetValueAtTime(double time, int sample_rate) const;

	// Process automation for a block of samples
	void Process(float* output, int frame_count, double current_time, int sample_rate);

	// Audio-rate modulation support
	void AddModulationInput(float* input, int frame_count);
	void ClearModulationInputs();
	bool HasModulationInputs() const { return has_modulation_; }

private:
	float value_;
	// float default_value_;  // Unused for now, could be useful for reset() method
	float min_value_;
	float max_value_;

	std::vector<AutomationEvent> events_;
	mutable std::mutex mutex_;

	// Modulation support
	std::vector<float> modulation_buffer_;
	bool has_modulation_ = false;

	float ClampValue(float v) const;
	void SortEvents();
};

} // namespace webaudio

#endif // WEBAUDIO_AUDIO_PARAM_H
