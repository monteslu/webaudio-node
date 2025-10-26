#ifndef WEBAUDIO_AUDIO_ENGINE_H
#define WEBAUDIO_AUDIO_ENGINE_H

#include <napi.h>
#include <SDL.h>
#include <memory>
#include <mutex>
#include "audio_graph.h"

namespace webaudio {

class AudioEngine : public Napi::ObjectWrap<AudioEngine> {
public:
	static Napi::Object Init(Napi::Env env, Napi::Object exports);
	static Napi::FunctionReference constructor;

	AudioEngine(const Napi::CallbackInfo& info);
	~AudioEngine();

	// N-API methods
	Napi::Value GetCurrentTime(const Napi::CallbackInfo& info);
	Napi::Value GetSampleRate(const Napi::CallbackInfo& info);
	Napi::Value GetState(const Napi::CallbackInfo& info);
	Napi::Value Resume(const Napi::CallbackInfo& info);
	Napi::Value Suspend(const Napi::CallbackInfo& info);
	Napi::Value Close(const Napi::CallbackInfo& info);

	Napi::Value CreateNode(const Napi::CallbackInfo& info);
	Napi::Value ConnectNodes(const Napi::CallbackInfo& info);
	Napi::Value ConnectToParam(const Napi::CallbackInfo& info);
	Napi::Value DisconnectNodes(const Napi::CallbackInfo& info);
	Napi::Value StartNode(const Napi::CallbackInfo& info);
	Napi::Value StopNode(const Napi::CallbackInfo& info);
	Napi::Value SetNodeParameter(const Napi::CallbackInfo& info);
	Napi::Value SetNodeProperty(const Napi::CallbackInfo& info);
	Napi::Value SetNodeStringProperty(const Napi::CallbackInfo& info);
	Napi::Value SetNodePeriodicWave(const Napi::CallbackInfo& info);
	Napi::Value ScheduleParameterValue(const Napi::CallbackInfo& info);

	// Shared buffer management
	Napi::Value RegisterBuffer(const Napi::CallbackInfo& info);
	Napi::Value SetNodeBufferId(const Napi::CallbackInfo& info);

	// AnalyserNode methods
	Napi::Value SetAnalyserFFTSize(const Napi::CallbackInfo& info);
	Napi::Value SetAnalyserMinDecibels(const Napi::CallbackInfo& info);
	Napi::Value SetAnalyserMaxDecibels(const Napi::CallbackInfo& info);
	Napi::Value SetAnalyserSmoothingTimeConstant(const Napi::CallbackInfo& info);
	Napi::Value GetFloatFrequencyData(const Napi::CallbackInfo& info);
	Napi::Value GetByteFrequencyData(const Napi::CallbackInfo& info);
	Napi::Value GetFloatTimeDomainData(const Napi::CallbackInfo& info);
	Napi::Value GetByteTimeDomainData(const Napi::CallbackInfo& info);

	// DynamicsCompressorNode methods
	Napi::Value GetCompressorReduction(const Napi::CallbackInfo& info);

	// WaveShaperNode methods
	Napi::Value SetWaveShaperCurve(const Napi::CallbackInfo& info);
	Napi::Value ClearWaveShaperCurve(const Napi::CallbackInfo& info);
	Napi::Value SetWaveShaperOversample(const Napi::CallbackInfo& info);

	// IIRFilterNode methods
	Napi::Value GetIIRFilterFrequencyResponse(const Napi::CallbackInfo& info);

	// AudioWorkletNode methods
	Napi::Value AddWorkletParameter(const Napi::CallbackInfo& info);
	Napi::Value SetWorkletProcessCallback(const Napi::CallbackInfo& info);

	// MediaStreamSource methods
	Napi::Value StartAudioCapture(const Napi::CallbackInfo& info);
	Napi::Value StopAudioCapture(const Napi::CallbackInfo& info);
	Napi::Value GetInputDevices(const Napi::CallbackInfo& info);

	// Audio callbacks (called from SDL audio thread)
	static void AudioCallback(void* userdata, Uint8* stream, int len);
	static void CaptureCallback(void* userdata, Uint8* stream, int len);

	// Public accessors for audio graph
	AudioGraph* GetGraph() { return graph_.get(); }
	int GetSampleRateValue() const { return sample_rate_; }
	double GetCurrentTimeValue() const;

private:
	SDL_AudioDeviceID device_id_;
	SDL_AudioSpec audio_spec_;
	int sample_rate_;
	int channels_;
	int buffer_size_;

	// Audio capture
	SDL_AudioDeviceID capture_device_id_;
	SDL_AudioSpec capture_spec_;
	uint32_t capture_node_id_;
	std::atomic<bool> is_capturing_{false};

	std::unique_ptr<AudioGraph> graph_;
	std::atomic<uint64_t> samples_processed_{0};
	std::atomic<bool> is_running_{false};

	enum class State { SUSPENDED, RUNNING, CLOSED };
	std::atomic<State> state_{State::SUSPENDED};
};

} // namespace webaudio

#endif // WEBAUDIO_AUDIO_ENGINE_H
