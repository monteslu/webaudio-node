#ifndef WEBAUDIO_OFFLINE_AUDIO_ENGINE_H
#define WEBAUDIO_OFFLINE_AUDIO_ENGINE_H

#include <napi.h>
#include <memory>
#include "audio_graph.h"

namespace webaudio {

// Offline audio rendering engine
// Processes audio graph non-realtime, returns rendered buffer
class OfflineAudioEngine : public Napi::ObjectWrap<OfflineAudioEngine> {
public:
	static Napi::Object Init(Napi::Env env, Napi::Object exports);
	OfflineAudioEngine(const Napi::CallbackInfo& info);
	~OfflineAudioEngine();

private:
	// Node creation
	Napi::Value CreateNode(const Napi::CallbackInfo& info);

	// Graph operations
	Napi::Value Connect(const Napi::CallbackInfo& info);
	Napi::Value ConnectToParam(const Napi::CallbackInfo& info);
	Napi::Value Disconnect(const Napi::CallbackInfo& info);
	Napi::Value DisconnectAll(const Napi::CallbackInfo& info);

	// Node control
	Napi::Value StartNode(const Napi::CallbackInfo& info);
	Napi::Value StopNode(const Napi::CallbackInfo& info);
	Napi::Value SetNodeParameter(const Napi::CallbackInfo& info);
	Napi::Value SetNodeBuffer(const Napi::CallbackInfo& info);
	Napi::Value SetNodeProperty(const Napi::CallbackInfo& info);
	Napi::Value SetNodeStringProperty(const Napi::CallbackInfo& info);
	Napi::Value SetNodePeriodicWave(const Napi::CallbackInfo& info);

	// Buffer management
	Napi::Value RegisterBuffer(const Napi::CallbackInfo& info);
	Napi::Value SetNodeBufferId(const Napi::CallbackInfo& info);

	// Parameter automation
	Napi::Value ScheduleParameterValue(const Napi::CallbackInfo& info);
	Napi::Value ScheduleParameterRamp(const Napi::CallbackInfo& info);
	Napi::Value ScheduleParameterTarget(const Napi::CallbackInfo& info);
	Napi::Value ScheduleParameterCurve(const Napi::CallbackInfo& info);
	Napi::Value CancelScheduledParameterValues(const Napi::CallbackInfo& info);
	Napi::Value CancelAndHoldParameterAtTime(const Napi::CallbackInfo& info);

	// Rendering (main feature!)
	Napi::Value StartRendering(const Napi::CallbackInfo& info);

	// Analyser node support
	Napi::Value SetAnalyserFFTSize(const Napi::CallbackInfo& info);
	Napi::Value SetAnalyserMinDecibels(const Napi::CallbackInfo& info);
	Napi::Value SetAnalyserMaxDecibels(const Napi::CallbackInfo& info);
	Napi::Value SetAnalyserSmoothingTimeConstant(const Napi::CallbackInfo& info);
	Napi::Value GetFrequencyData(const Napi::CallbackInfo& info);
	Napi::Value GetTimeDomainData(const Napi::CallbackInfo& info);
	Napi::Value GetFloatFrequencyData(const Napi::CallbackInfo& info);
	Napi::Value GetByteFrequencyData(const Napi::CallbackInfo& info);
	Napi::Value GetFloatTimeDomainData(const Napi::CallbackInfo& info);
	Napi::Value GetByteTimeDomainData(const Napi::CallbackInfo& info);

	// WaveShaper node support
	Napi::Value SetWaveShaperCurve(const Napi::CallbackInfo& info);
	Napi::Value ClearWaveShaperCurve(const Napi::CallbackInfo& info);
	Napi::Value SetWaveShaperOversample(const Napi::CallbackInfo& info);

	std::unique_ptr<AudioGraph> graph_;
	int sample_rate_;
	int channels_;
	int length_in_samples_;  // Total samples to render
};

} // namespace webaudio

#endif // WEBAUDIO_OFFLINE_AUDIO_ENGINE_H
