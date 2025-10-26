#include "offline_audio_engine.h"
#include "nodes/analyser_node.h"
#include <vector>

namespace webaudio {

Napi::Object OfflineAudioEngine::Init(Napi::Env env, Napi::Object exports) {
	Napi::Function func = DefineClass(env, "OfflineAudioEngine", {
		InstanceMethod("createNode", &OfflineAudioEngine::CreateNode),
		InstanceMethod("connectNodes", &OfflineAudioEngine::Connect),
		InstanceMethod("connectToParam", &OfflineAudioEngine::ConnectToParam),
		InstanceMethod("disconnectNodes", &OfflineAudioEngine::Disconnect),
		InstanceMethod("disconnectAll", &OfflineAudioEngine::DisconnectAll),
		InstanceMethod("startNode", &OfflineAudioEngine::StartNode),
		InstanceMethod("stopNode", &OfflineAudioEngine::StopNode),
		InstanceMethod("setNodeParameter", &OfflineAudioEngine::SetNodeParameter),
		InstanceMethod("setNodeBuffer", &OfflineAudioEngine::SetNodeBuffer),
		InstanceMethod("setNodeProperty", &OfflineAudioEngine::SetNodeProperty),
		InstanceMethod("setNodeStringProperty", &OfflineAudioEngine::SetNodeStringProperty),
		InstanceMethod("setNodePeriodicWave", &OfflineAudioEngine::SetNodePeriodicWave),
		InstanceMethod("registerBuffer", &OfflineAudioEngine::RegisterBuffer),
		InstanceMethod("setNodeBufferId", &OfflineAudioEngine::SetNodeBufferId),
		InstanceMethod("scheduleParameterValue", &OfflineAudioEngine::ScheduleParameterValue),
		InstanceMethod("scheduleParameterRamp", &OfflineAudioEngine::ScheduleParameterRamp),
		InstanceMethod("scheduleParameterTarget", &OfflineAudioEngine::ScheduleParameterTarget),
		InstanceMethod("scheduleParameterCurve", &OfflineAudioEngine::ScheduleParameterCurve),
		InstanceMethod("cancelScheduledParameterValues", &OfflineAudioEngine::CancelScheduledParameterValues),
		InstanceMethod("cancelAndHoldParameterAtTime", &OfflineAudioEngine::CancelAndHoldParameterAtTime),
		InstanceMethod("getFrequencyData", &OfflineAudioEngine::GetFrequencyData),
		InstanceMethod("getTimeDomainData", &OfflineAudioEngine::GetTimeDomainData),
		InstanceMethod("startRendering", &OfflineAudioEngine::StartRendering),
	});

	Napi::FunctionReference* constructor = new Napi::FunctionReference();
	*constructor = Napi::Persistent(func);
	env.SetInstanceData(constructor);

	exports.Set("OfflineAudioEngine", func);
	return exports;
}

OfflineAudioEngine::OfflineAudioEngine(const Napi::CallbackInfo& info)
	: Napi::ObjectWrap<OfflineAudioEngine>(info) {

	Napi::Env env = info.Env();

	if (info.Length() < 3) {
		Napi::TypeError::New(env, "Expected 3 arguments: numberOfChannels, length, sampleRate").ThrowAsJavaScriptException();
		return;
	}

	channels_ = info[0].As<Napi::Number>().Int32Value();
	length_in_samples_ = info[1].As<Napi::Number>().Int32Value();
	sample_rate_ = info[2].As<Napi::Number>().Int32Value();

	// Create audio graph (no real-time processing)
	int buffer_size = 512;  // Render chunk size
	graph_ = std::make_unique<AudioGraph>(sample_rate_, channels_, buffer_size);
}

OfflineAudioEngine::~OfflineAudioEngine() {
}

Napi::Value OfflineAudioEngine::CreateNode(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	std::string type = info[0].As<Napi::String>().Utf8Value();
	Napi::Object options = info[1].As<Napi::Object>();

	uint32_t node_id = graph_->CreateNode(type, options, env);

	return Napi::Number::New(env, node_id);
}

Napi::Value OfflineAudioEngine::Connect(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t source_id = info[0].As<Napi::Number>().Uint32Value();
	uint32_t dest_id = info[1].As<Napi::Number>().Uint32Value();
	uint32_t output_idx = info[2].As<Napi::Number>().Uint32Value();
	uint32_t input_idx = info[3].As<Napi::Number>().Uint32Value();

	graph_->Connect(source_id, dest_id, output_idx, input_idx);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::ConnectToParam(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t source_id = info[0].As<Napi::Number>().Uint32Value();
	uint32_t dest_id = info[1].As<Napi::Number>().Uint32Value();
	std::string param_name = info[2].As<Napi::String>().Utf8Value();
	uint32_t output_idx = info[3].As<Napi::Number>().Uint32Value();

	graph_->ConnectToParam(source_id, dest_id, param_name, output_idx);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::Disconnect(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t source_id = info[0].As<Napi::Number>().Uint32Value();
	uint32_t dest_id = info[1].As<Napi::Number>().Uint32Value();

	graph_->Disconnect(source_id, dest_id);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::DisconnectAll(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t source_id = info[0].As<Napi::Number>().Uint32Value();

	graph_->DisconnectAll(source_id);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::StartNode(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	double when = info[1].As<Napi::Number>().DoubleValue();

	graph_->StartNode(node_id, when);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::StopNode(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	double when = info[1].As<Napi::Number>().DoubleValue();

	graph_->StopNode(node_id, when);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::SetNodeParameter(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	float value = info[2].As<Napi::Number>().FloatValue();

	graph_->SetNodeParameter(node_id, param_name, value);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::SetNodeBuffer(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Buffer<float> buffer = info[1].As<Napi::Buffer<float>>();
	int32_t length = info[2].As<Napi::Number>().Int32Value();
	int32_t num_channels = info[3].As<Napi::Number>().Int32Value();

	graph_->SetNodeBuffer(node_id, buffer.Data(), length, num_channels);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::SetNodeProperty(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string property_name = info[1].As<Napi::String>().Utf8Value();
	bool value = info[2].As<Napi::Boolean>().Value();

	graph_->SetNodeProperty(node_id, property_name, value);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::SetNodeStringProperty(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string property_name = info[1].As<Napi::String>().Utf8Value();
	std::string value = info[2].As<Napi::String>().Utf8Value();

	graph_->SetNodeStringProperty(node_id, property_name, value);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::SetNodePeriodicWave(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Buffer<float> wavetable = info[1].As<Napi::Buffer<float>>();
	int32_t size = info[2].As<Napi::Number>().Int32Value();

	graph_->SetNodePeriodicWave(node_id, wavetable.Data(), size);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::RegisterBuffer(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t buffer_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Buffer<float> buffer = info[1].As<Napi::Buffer<float>>();
	int32_t length = info[2].As<Napi::Number>().Int32Value();
	int32_t num_channels = info[3].As<Napi::Number>().Int32Value();

	graph_->RegisterBuffer(buffer_id, buffer.Data(), length, num_channels);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::SetNodeBufferId(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	uint32_t buffer_id = info[1].As<Napi::Number>().Uint32Value();

	graph_->SetNodeBufferId(node_id, buffer_id);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::ScheduleParameterValue(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	std::string method = info[2].As<Napi::String>().Utf8Value();

	if (method == "setValueAtTime") {
		float value = info[3].As<Napi::Number>().FloatValue();
		double start_time = info[4].As<Napi::Number>().DoubleValue();
		graph_->ScheduleParameterValue(node_id, param_name, value, start_time);
	}
	else if (method == "linearRampToValueAtTime") {
		float value = info[3].As<Napi::Number>().FloatValue();
		double start_time = info[4].As<Napi::Number>().DoubleValue();
		graph_->ScheduleParameterRamp(node_id, param_name, value, start_time, false);
	}
	else if (method == "exponentialRampToValueAtTime") {
		float value = info[3].As<Napi::Number>().FloatValue();
		double start_time = info[4].As<Napi::Number>().DoubleValue();
		graph_->ScheduleParameterRamp(node_id, param_name, value, start_time, true);
	}
	else if (method == "setTargetAtTime") {
		float target = info[3].As<Napi::Number>().FloatValue();
		double start_time = info[4].As<Napi::Number>().DoubleValue();
		double time_constant = info[5].As<Napi::Number>().DoubleValue();
		graph_->ScheduleParameterTarget(node_id, param_name, target, start_time, time_constant);
	}
	else if (method == "setValueCurveAtTime") {
		Napi::Array values_array = info[3].As<Napi::Array>();
		double start_time = info[4].As<Napi::Number>().DoubleValue();
		double duration = info[5].As<Napi::Number>().DoubleValue();

		std::vector<float> values;
		for (uint32_t i = 0; i < values_array.Length(); ++i) {
			values.push_back(values_array.Get(i).As<Napi::Number>().FloatValue());
		}

		graph_->ScheduleParameterCurve(node_id, param_name, values, start_time, duration);
	}
	else if (method == "cancelScheduledValues") {
		double cancel_time = info[3].As<Napi::Number>().DoubleValue();
		graph_->CancelScheduledParameterValues(node_id, param_name, cancel_time);
	}
	else if (method == "cancelAndHoldAtTime") {
		double cancel_time = info[3].As<Napi::Number>().DoubleValue();
		graph_->CancelAndHoldParameterAtTime(node_id, param_name, cancel_time);
	}

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::ScheduleParameterRamp(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	float value = info[2].As<Napi::Number>().FloatValue();
	double time = info[3].As<Napi::Number>().DoubleValue();
	bool exponential = info[4].As<Napi::Boolean>().Value();

	graph_->ScheduleParameterRamp(node_id, param_name, value, time, exponential);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::ScheduleParameterTarget(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	float target = info[2].As<Napi::Number>().FloatValue();
	double time = info[3].As<Napi::Number>().DoubleValue();
	double time_constant = info[4].As<Napi::Number>().DoubleValue();

	graph_->ScheduleParameterTarget(node_id, param_name, target, time, time_constant);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::ScheduleParameterCurve(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	Napi::Array values_array = info[2].As<Napi::Array>();
	double time = info[3].As<Napi::Number>().DoubleValue();
	double duration = info[4].As<Napi::Number>().DoubleValue();

	std::vector<float> values;
	for (uint32_t i = 0; i < values_array.Length(); ++i) {
		values.push_back(values_array.Get(i).As<Napi::Number>().FloatValue());
	}

	graph_->ScheduleParameterCurve(node_id, param_name, values, time, duration);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::CancelScheduledParameterValues(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	double cancel_time = info[2].As<Napi::Number>().DoubleValue();

	graph_->CancelScheduledParameterValues(node_id, param_name, cancel_time);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::CancelAndHoldParameterAtTime(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	double cancel_time = info[2].As<Napi::Number>().DoubleValue();

	graph_->CancelAndHoldParameterAtTime(node_id, param_name, cancel_time);

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::GetFrequencyData(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Float32Array array = info[1].As<Napi::Float32Array>();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->GetFloatFrequencyData(reinterpret_cast<float*>(array.Data()), array.ElementLength());
		}
	}

	return env.Undefined();
}

Napi::Value OfflineAudioEngine::GetTimeDomainData(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Float32Array array = info[1].As<Napi::Float32Array>();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->GetFloatTimeDomainData(reinterpret_cast<float*>(array.Data()), array.ElementLength());
		}
	}

	return env.Undefined();
}

// Main feature: Render entire audio graph to buffer
Napi::Value OfflineAudioEngine::StartRendering(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	// Allocate output buffer
	int total_samples = length_in_samples_ * channels_;
	std::vector<float> output_buffer(total_samples, 0.0f);

	// Render in chunks
	int buffer_size = 512;  // Process 512 frames at a time
	int frames_rendered = 0;

	while (frames_rendered < length_in_samples_) {
		int frames_to_render = std::min(buffer_size, length_in_samples_ - frames_rendered);
		int offset = frames_rendered * channels_;

		// Process audio graph for this chunk
		graph_->Process(output_buffer.data() + offset, frames_to_render);

		frames_rendered += frames_to_render;
	}

	// Create Float32Array to return to JavaScript
	Napi::ArrayBuffer array_buffer = Napi::ArrayBuffer::New(env, total_samples * sizeof(float));
	float* data = reinterpret_cast<float*>(array_buffer.Data());
	std::copy(output_buffer.begin(), output_buffer.end(), data);

	Napi::Float32Array float32_array = Napi::Float32Array::New(env, total_samples, array_buffer, 0);

	return float32_array;
}

} // namespace webaudio
