#ifndef WEBAUDIO_OSCILLATOR_NODE_H
#define WEBAUDIO_OSCILLATOR_NODE_H

#include "audio_node.h"
#include "../audio_param.h"
#include <memory>
#include <string>

namespace webaudio {

class OscillatorNode : public AudioNode {
public:
	enum class WaveType {
		SINE,
		SQUARE,
		SAWTOOTH,
		TRIANGLE,
		CUSTOM
	};

	OscillatorNode(int sample_rate, int channels, const std::string& type = "sine");
	~OscillatorNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	// Set custom waveform (wavetable)
	void SetPeriodicWave(const float* wavetable, int size);

	void Start(double when) override;
	void Stop(double when) override;

	void SetParameter(const std::string& name, float value) override;
	void ScheduleParameterValue(const std::string& name, float value, double time) override;
	void ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential) override;
	void ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant) override;
	void ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration) override;
	void CancelScheduledParameterValues(const std::string& name, double cancel_time) override;
	void CancelAndHoldParameterAtTime(const std::string& name, double cancel_time, int sample_rate) override;

	AudioParam* GetAudioParam(const std::string& name) override;

private:
	WaveType wave_type_;
	std::unique_ptr<AudioParam> frequency_param_;
	std::unique_ptr<AudioParam> detune_param_;

	double phase_;

	// Custom wavetable for CUSTOM wave type
	std::vector<float> custom_wavetable_;

	// Optimized sine wavetable (static, shared across all oscillators)
	static constexpr int SINE_TABLE_SIZE = 2048;
	static float sine_table_[SINE_TABLE_SIZE];
	static bool sine_table_initialized_;
	static void InitializeSineTable();

	float GenerateSample();
	WaveType StringToWaveType(const std::string& type);
};

} // namespace webaudio

#endif // WEBAUDIO_OSCILLATOR_NODE_H
