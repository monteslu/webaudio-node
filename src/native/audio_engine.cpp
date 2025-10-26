#include "audio_engine.h"
#include "nodes/analyser_node.h"
#include "nodes/dynamics_compressor_node.h"
#include "nodes/wave_shaper_node.h"
#include "nodes/iir_filter_node.h"
#include "nodes/audio_worklet_node.h"
#include "nodes/media_stream_source_node.h"
#include <cstring>
#include <iostream>
#include <mutex>
#include <condition_variable>

namespace webaudio {

Napi::FunctionReference AudioEngine::constructor;

Napi::Object AudioEngine::Init(Napi::Env env, Napi::Object exports) {
	Napi::Function func = DefineClass(env, "AudioEngine", {
		InstanceMethod("getCurrentTime", &AudioEngine::GetCurrentTime),
		InstanceMethod("getSampleRate", &AudioEngine::GetSampleRate),
		InstanceMethod("getState", &AudioEngine::GetState),
		InstanceMethod("resume", &AudioEngine::Resume),
		InstanceMethod("suspend", &AudioEngine::Suspend),
		InstanceMethod("close", &AudioEngine::Close),
		InstanceMethod("createNode", &AudioEngine::CreateNode),
		InstanceMethod("connectNodes", &AudioEngine::ConnectNodes),
		InstanceMethod("connectToParam", &AudioEngine::ConnectToParam),
		InstanceMethod("disconnectNodes", &AudioEngine::DisconnectNodes),
		InstanceMethod("startNode", &AudioEngine::StartNode),
		InstanceMethod("stopNode", &AudioEngine::StopNode),
		InstanceMethod("setNodeParameter", &AudioEngine::SetNodeParameter),
		InstanceMethod("setNodeProperty", &AudioEngine::SetNodeProperty),
		InstanceMethod("setNodeStringProperty", &AudioEngine::SetNodeStringProperty),
		InstanceMethod("setNodePeriodicWave", &AudioEngine::SetNodePeriodicWave),
		InstanceMethod("scheduleParameterValue", &AudioEngine::ScheduleParameterValue),
		InstanceMethod("registerBuffer", &AudioEngine::RegisterBuffer),
		InstanceMethod("setNodeBufferId", &AudioEngine::SetNodeBufferId),
		InstanceMethod("setAnalyserFFTSize", &AudioEngine::SetAnalyserFFTSize),
		InstanceMethod("setAnalyserMinDecibels", &AudioEngine::SetAnalyserMinDecibels),
		InstanceMethod("setAnalyserMaxDecibels", &AudioEngine::SetAnalyserMaxDecibels),
		InstanceMethod("setAnalyserSmoothingTimeConstant", &AudioEngine::SetAnalyserSmoothingTimeConstant),
		InstanceMethod("getFloatFrequencyData", &AudioEngine::GetFloatFrequencyData),
		InstanceMethod("getByteFrequencyData", &AudioEngine::GetByteFrequencyData),
		InstanceMethod("getFloatTimeDomainData", &AudioEngine::GetFloatTimeDomainData),
		InstanceMethod("getByteTimeDomainData", &AudioEngine::GetByteTimeDomainData),
		InstanceMethod("getCompressorReduction", &AudioEngine::GetCompressorReduction),
		InstanceMethod("setWaveShaperCurve", &AudioEngine::SetWaveShaperCurve),
		InstanceMethod("clearWaveShaperCurve", &AudioEngine::ClearWaveShaperCurve),
		InstanceMethod("setWaveShaperOversample", &AudioEngine::SetWaveShaperOversample),
		InstanceMethod("getIIRFilterFrequencyResponse", &AudioEngine::GetIIRFilterFrequencyResponse),
		InstanceMethod("addWorkletParameter", &AudioEngine::AddWorkletParameter),
		InstanceMethod("setWorkletProcessCallback", &AudioEngine::SetWorkletProcessCallback),
		InstanceMethod("startAudioCapture", &AudioEngine::StartAudioCapture),
		InstanceMethod("stopAudioCapture", &AudioEngine::StopAudioCapture),
		InstanceMethod("getInputDevices", &AudioEngine::GetInputDevices),
	});

	constructor = Napi::Persistent(func);
	constructor.SuppressDestruct();

	exports.Set("AudioEngine", func);
	return exports;
}

AudioEngine::AudioEngine(const Napi::CallbackInfo& info)
	: Napi::ObjectWrap<AudioEngine>(info) {

	Napi::Env env = info.Env();

	// Parse options
	Napi::Object options = info[0].IsObject() ? info[0].As<Napi::Object>() : Napi::Object::New(env);

	sample_rate_ = options.Has("sampleRate") ? options.Get("sampleRate").As<Napi::Number>().Int32Value() : 44100;
	channels_ = options.Has("channels") ? options.Get("channels").As<Napi::Number>().Int32Value() : 2;
	buffer_size_ = options.Has("bufferSize") ? options.Get("bufferSize").As<Napi::Number>().Int32Value() : 512;

	// Initialize SDL audio subsystem
	if (SDL_Init(SDL_INIT_AUDIO) < 0) {
		Napi::Error::New(env, std::string("SDL_Init failed: ") + SDL_GetError()).ThrowAsJavaScriptException();
		return;
	}

	// Configure audio spec
	SDL_AudioSpec desired_spec;
	SDL_zero(desired_spec);
	desired_spec.freq = sample_rate_;
	desired_spec.format = AUDIO_F32SYS;  // 32-bit float, system byte order
	desired_spec.channels = channels_;
	desired_spec.samples = buffer_size_;
	desired_spec.callback = AudioCallback;
	desired_spec.userdata = this;

	// List available audio devices
	int num_devices = SDL_GetNumAudioDevices(0);
	std::cout << "\n=== SDL Audio Devices (output) ===" << std::endl;
	for (int i = 0; i < num_devices; i++) {
		const char* name = SDL_GetAudioDeviceName(i, 0);
		std::cout << "  [" << i << "] " << (name ? name : "Unknown") << std::endl;
	}

	// Try to explicitly open device 0 first, fall back to default
	const char* device_name = nullptr;
	if (num_devices > 0) {
		device_name = SDL_GetAudioDeviceName(0, 0);
		std::cout << "\nAttempting to open device 0: " << (device_name ? device_name : "Unknown") << std::endl;
	}

	// Open audio device
	device_id_ = SDL_OpenAudioDevice(device_name, 0, &desired_spec, &audio_spec_, 0);
	if (device_id_ == 0) {
		SDL_Quit();
		Napi::Error::New(env, std::string("SDL_OpenAudioDevice failed: ") + SDL_GetError()).ThrowAsJavaScriptException();
		return;
	}

	// Show which device was opened
	const char* opened_device_name = SDL_GetAudioDeviceName(device_id_ - 1, 0);
	std::cout << "\nOpened audio device: " << (opened_device_name ? opened_device_name : "Unknown") << std::endl;
	std::cout << "  Sample rate: " << audio_spec_.freq << " Hz" << std::endl;
	std::cout << "  Channels: " << (int)audio_spec_.channels << std::endl;
	std::cout << "  Buffer size: " << audio_spec_.samples << " samples" << std::endl;
	std::cout << "  Format: " << (audio_spec_.format == AUDIO_F32SYS ? "F32" : "Other") << std::endl;
	std::cout << "==================================\n" << std::endl;

	// Update with actual spec
	sample_rate_ = audio_spec_.freq;
	channels_ = audio_spec_.channels;
	buffer_size_ = audio_spec_.samples;

	// Create audio graph
	graph_ = std::make_unique<AudioGraph>(sample_rate_, channels_, buffer_size_);

	// Initialize capture
	capture_device_id_ = 0;
	capture_node_id_ = 0;
}

AudioEngine::~AudioEngine() {
	// Close capture device if open
	if (capture_device_id_ != 0) {
		SDL_CloseAudioDevice(capture_device_id_);
	}

	// Close playback device
	if (device_id_ != 0) {
		SDL_CloseAudioDevice(device_id_);
	}
	SDL_Quit();
}

void AudioEngine::AudioCallback(void* userdata, Uint8* stream, int len) {
	AudioEngine* engine = static_cast<AudioEngine*>(userdata);
	if (!engine || !engine->is_running_) {
		std::memset(stream, 0, len);
		return;
	}

	float* output = reinterpret_cast<float*>(stream);
	int frame_count = len / (sizeof(float) * engine->channels_);

	// Process audio graph
	engine->graph_->Process(output, frame_count);

	// Debug: Log callback activity every 0.5 seconds
	static uint64_t last_log_samples = 0;
	if (engine->samples_processed_ - last_log_samples > (uint64_t)(engine->sample_rate_ * 0.5)) {
		// Calculate peak level in this buffer
		float peak = 0.0f;
		for (int i = 0; i < frame_count * engine->channels_; i++) {
			float abs_val = std::abs(output[i]);
			if (abs_val > peak) peak = abs_val;
		}
		std::cout << "[Audio Callback] Time: " << (engine->samples_processed_ / (float)engine->sample_rate_)
		          << "s, Peak: " << peak << std::endl;
		last_log_samples = engine->samples_processed_;
	}

	// Update sample counter
	engine->samples_processed_ += frame_count;
}

double AudioEngine::GetCurrentTimeValue() const {
	return static_cast<double>(samples_processed_.load()) / static_cast<double>(sample_rate_);
}

Napi::Value AudioEngine::GetCurrentTime(const Napi::CallbackInfo& info) {
	return Napi::Number::New(info.Env(), GetCurrentTimeValue());
}

Napi::Value AudioEngine::GetSampleRate(const Napi::CallbackInfo& info) {
	return Napi::Number::New(info.Env(), sample_rate_);
}

Napi::Value AudioEngine::GetState(const Napi::CallbackInfo& info) {
	State state = state_.load();
	std::string state_str;
	switch (state) {
		case State::SUSPENDED: state_str = "suspended"; break;
		case State::RUNNING: state_str = "running"; break;
		case State::CLOSED: state_str = "closed"; break;
	}
	return Napi::String::New(info.Env(), state_str);
}

Napi::Value AudioEngine::Resume(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (state_ == State::CLOSED) {
		Napi::Error::New(env, "Cannot resume a closed AudioContext").ThrowAsJavaScriptException();
		return env.Undefined();
	}

	if (state_ == State::SUSPENDED) {
		std::cout << "[Resume] Setting is_running_ = true and unpausing SDL audio device" << std::endl;
		is_running_ = true;
		SDL_PauseAudioDevice(device_id_, 0);
		state_ = State::RUNNING;
		std::cout << "[Resume] Audio device should now be playing" << std::endl;
	} else {
		std::cout << "[Resume] Already running or in unexpected state" << std::endl;
	}

	return env.Undefined();
}

Napi::Value AudioEngine::Suspend(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (state_ == State::RUNNING) {
		is_running_ = false;
		SDL_PauseAudioDevice(device_id_, 1);
		state_ = State::SUSPENDED;
	}

	return env.Undefined();
}

Napi::Value AudioEngine::Close(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (state_ != State::CLOSED) {
		is_running_ = false;
		if (device_id_ != 0) {
			SDL_CloseAudioDevice(device_id_);
			device_id_ = 0;
		}
		state_ = State::CLOSED;
	}

	return env.Undefined();
}

Napi::Value AudioEngine::CreateNode(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	std::string node_type = info[0].As<Napi::String>().Utf8Value();
	Napi::Object options = info.Length() > 1 && info[1].IsObject() ? info[1].As<Napi::Object>() : Napi::Object::New(env);

	uint32_t node_id = graph_->CreateNode(node_type, options, env);

	return Napi::Number::New(env, node_id);
}

Napi::Value AudioEngine::ConnectNodes(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t source_id = info[0].As<Napi::Number>().Uint32Value();
	uint32_t dest_id = info[1].As<Napi::Number>().Uint32Value();
	uint32_t output_index = info.Length() > 2 ? info[2].As<Napi::Number>().Uint32Value() : 0;
	uint32_t input_index = info.Length() > 3 ? info[3].As<Napi::Number>().Uint32Value() : 0;

	graph_->Connect(source_id, dest_id, output_index, input_index);

	return env.Undefined();
}

Napi::Value AudioEngine::ConnectToParam(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t source_id = info[0].As<Napi::Number>().Uint32Value();
	uint32_t dest_id = info[1].As<Napi::Number>().Uint32Value();
	std::string param_name = info[2].As<Napi::String>().Utf8Value();
	uint32_t output_index = info.Length() > 3 ? info[3].As<Napi::Number>().Uint32Value() : 0;

	graph_->ConnectToParam(source_id, dest_id, param_name, output_index);

	return env.Undefined();
}

Napi::Value AudioEngine::DisconnectNodes(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t source_id = info[0].As<Napi::Number>().Uint32Value();

	if (info.Length() > 1 && info[1].IsNumber()) {
		uint32_t dest_id = info[1].As<Napi::Number>().Uint32Value();
		graph_->Disconnect(source_id, dest_id);
	} else {
		graph_->DisconnectAll(source_id);
	}

	return env.Undefined();
}

Napi::Value AudioEngine::StartNode(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	double when = info.Length() > 1 ? info[1].As<Napi::Number>().DoubleValue() : 0.0;

	graph_->StartNode(node_id, when);

	return env.Undefined();
}

Napi::Value AudioEngine::StopNode(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	double when = info.Length() > 1 ? info[1].As<Napi::Number>().DoubleValue() : 0.0;

	graph_->StopNode(node_id, when);

	return env.Undefined();
}

Napi::Value AudioEngine::SetNodeParameter(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();

	if (info[2].IsBuffer()) {
		// Setting buffer data for AudioBufferSourceNode
		Napi::Buffer<float> buffer = info[2].As<Napi::Buffer<float>>();
		int32_t length = info[3].As<Napi::Number>().Int32Value();
		int32_t num_channels = info[4].As<Napi::Number>().Int32Value();

		graph_->SetNodeBuffer(node_id, buffer.Data(), length, num_channels);
	} else {
		// Setting numeric parameter
		float value = info[2].As<Napi::Number>().FloatValue();
		graph_->SetNodeParameter(node_id, param_name, value);
	}

	return env.Undefined();
}

Napi::Value AudioEngine::SetNodeProperty(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string property_name = info[1].As<Napi::String>().Utf8Value();
	bool value = info[2].As<Napi::Boolean>().Value();

	graph_->SetNodeProperty(node_id, property_name, value);

	return env.Undefined();
}

Napi::Value AudioEngine::SetNodeStringProperty(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string property_name = info[1].As<Napi::String>().Utf8Value();
	std::string value = info[2].As<Napi::String>().Utf8Value();

	graph_->SetNodeStringProperty(node_id, property_name, value);

	return env.Undefined();
}

Napi::Value AudioEngine::SetNodePeriodicWave(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Float32Array wavetable = info[1].As<Napi::Float32Array>();

	graph_->SetNodePeriodicWave(node_id, wavetable.Data(), wavetable.ElementLength());

	return env.Undefined();
}

Napi::Value AudioEngine::ScheduleParameterValue(const Napi::CallbackInfo& info) {
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

Napi::Value AudioEngine::SetAnalyserFFTSize(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	int size = info[1].As<Napi::Number>().Int32Value();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->SetFFTSize(size);
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::SetAnalyserMinDecibels(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	float value = info[1].As<Napi::Number>().FloatValue();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->SetMinDecibels(value);
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::SetAnalyserMaxDecibels(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	float value = info[1].As<Napi::Number>().FloatValue();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->SetMaxDecibels(value);
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::SetAnalyserSmoothingTimeConstant(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	float value = info[1].As<Napi::Number>().FloatValue();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->SetSmoothingTimeConstant(value);
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::GetFloatFrequencyData(const Napi::CallbackInfo& info) {
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

Napi::Value AudioEngine::GetByteFrequencyData(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Uint8Array array = info[1].As<Napi::Uint8Array>();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->GetByteFrequencyData(array.Data(), array.ElementLength());
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::GetFloatTimeDomainData(const Napi::CallbackInfo& info) {
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

Napi::Value AudioEngine::GetByteTimeDomainData(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Uint8Array array = info[1].As<Napi::Uint8Array>();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		AnalyserNode* analyser = dynamic_cast<AnalyserNode*>(node);
		if (analyser) {
			analyser->GetByteTimeDomainData(array.Data(), array.ElementLength());
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::GetCompressorReduction(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		DynamicsCompressorNode* compressor = dynamic_cast<DynamicsCompressorNode*>(node);
		if (compressor) {
			return Napi::Number::New(env, compressor->GetReduction());
		}
	}

	return Napi::Number::New(env, 0.0f);
}

Napi::Value AudioEngine::SetWaveShaperCurve(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Float32Array curve_array = info[1].As<Napi::Float32Array>();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		WaveShaperNode* shaper = dynamic_cast<WaveShaperNode*>(node);
		if (shaper) {
			shaper->SetCurve(reinterpret_cast<float*>(curve_array.Data()), curve_array.ElementLength());
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::ClearWaveShaperCurve(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		WaveShaperNode* shaper = dynamic_cast<WaveShaperNode*>(node);
		if (shaper) {
			shaper->ClearCurve();
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::SetWaveShaperOversample(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string oversample_str = info[1].As<Napi::String>().Utf8Value();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		WaveShaperNode* shaper = dynamic_cast<WaveShaperNode*>(node);
		if (shaper) {
			WaveShaperNode::Oversample oversample = WaveShaperNode::Oversample::NONE;
			if (oversample_str == "2x") {
				oversample = WaveShaperNode::Oversample::X2;
			} else if (oversample_str == "4x") {
				oversample = WaveShaperNode::Oversample::X4;
			}
			shaper->SetOversample(oversample);
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::GetIIRFilterFrequencyResponse(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Float32Array frequency_hz = info[1].As<Napi::Float32Array>();
	Napi::Float32Array mag_response = info[2].As<Napi::Float32Array>();
	Napi::Float32Array phase_response = info[3].As<Napi::Float32Array>();

	AudioNode* node = graph_->GetNode(node_id);
	if (node) {
		IIRFilterNode* iir = dynamic_cast<IIRFilterNode*>(node);
		if (iir) {
			iir->GetFrequencyResponse(
				reinterpret_cast<float*>(frequency_hz.Data()),
				reinterpret_cast<float*>(mag_response.Data()),
				reinterpret_cast<float*>(phase_response.Data()),
				frequency_hz.ElementLength()
			);
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::RegisterBuffer(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t buffer_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Buffer<float> buffer = info[1].As<Napi::Buffer<float>>();
	int32_t length = info[2].As<Napi::Number>().Int32Value();
	int32_t num_channels = info[3].As<Napi::Number>().Int32Value();

	graph_->RegisterBuffer(buffer_id, buffer.Data(), length, num_channels);

	return env.Undefined();
}

Napi::Value AudioEngine::SetNodeBufferId(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	uint32_t buffer_id = info[1].As<Napi::Number>().Uint32Value();

	graph_->SetNodeBufferId(node_id, buffer_id);

	return env.Undefined();
}

Napi::Value AudioEngine::AddWorkletParameter(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	std::string param_name = info[1].As<Napi::String>().Utf8Value();
	float default_value = info[2].As<Napi::Number>().FloatValue();
	float min_value = info[3].As<Napi::Number>().FloatValue();
	float max_value = info[4].As<Napi::Number>().FloatValue();

	auto node = graph_->GetNode(node_id);
	if (node) {
		auto* worklet_node = dynamic_cast<AudioWorkletNode*>(node);
		if (worklet_node) {
			worklet_node->AddParameter(param_name, default_value, min_value, max_value);
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::SetWorkletProcessCallback(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	Napi::Function js_callback = info[1].As<Napi::Function>();

	// Store the callback as a thread-safe function
	auto tsfn = Napi::ThreadSafeFunction::New(
		env,
		js_callback,
		"AudioWorkletProcessCallback",
		0,  // Unlimited queue
		1   // Single thread
	);

	auto node = graph_->GetNode(node_id);
	if (node) {
		auto* worklet_node = dynamic_cast<AudioWorkletNode*>(node);
		if (worklet_node) {
			// Capture channels for sample count calculation
			int channels = worklet_node->GetChannels();

			// Create a C++ callback that calls the JavaScript function
			worklet_node->SetProcessCallback([tsfn, channels](
				const std::vector<const float*>& inputs,
				const std::vector<float*>& outputs,
				const std::map<std::string, float>& params,
				int frame_count
			) {
				// Calculate sample count (interleaved samples)
				int sample_count = frame_count * channels;

				// Use mutex and condition variable for synchronization
				std::mutex mtx;
				std::condition_variable cv;
				bool done = false;

				// Call JavaScript from audio thread via thread-safe function
				auto callback = [inputs, outputs, params, frame_count, sample_count, &mtx, &cv, &done](Napi::Env env, Napi::Function js_fn) {
					// Create JavaScript arrays for inputs
					Napi::Array js_inputs = Napi::Array::New(env, inputs.size());
					for (size_t i = 0; i < inputs.size(); ++i) {
						Napi::Float32Array arr = Napi::Float32Array::New(env, sample_count);
						std::memcpy(arr.Data(), inputs[i], sample_count * sizeof(float));
						js_inputs[i] = arr;
					}

					// Create JavaScript arrays for outputs (initialized to zero)
					Napi::Array js_outputs = Napi::Array::New(env, outputs.size());
					for (size_t i = 0; i < outputs.size(); ++i) {
						Napi::Float32Array arr = Napi::Float32Array::New(env, sample_count);
						// Initialize to zero
						std::memset(arr.Data(), 0, sample_count * sizeof(float));
						js_outputs[i] = arr;
					}

					// Create JavaScript object for parameters
					Napi::Object js_params = Napi::Object::New(env);
					for (const auto& pair : params) {
						js_params.Set(pair.first, pair.second);
					}

					// Call the JavaScript function
					js_fn.Call({js_inputs, js_outputs, js_params, Napi::Number::New(env, frame_count)});

					// Copy output data back
					for (size_t i = 0; i < outputs.size(); ++i) {
						Napi::Float32Array arr = js_outputs.Get(i).As<Napi::Float32Array>();
						std::memcpy(outputs[i], arr.Data(), sample_count * sizeof(float));
					}

					// Signal that we're done
					{
						std::lock_guard<std::mutex> lock(mtx);
						done = true;
					}
					cv.notify_one();
				};

				tsfn.BlockingCall(callback);

				// Wait for the callback to complete
				{
					std::unique_lock<std::mutex> lock(mtx);
					cv.wait(lock, [&done]() { return done; });
				}
			});
		}
	}

	return env.Undefined();
}

Napi::Value AudioEngine::GetInputDevices(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	// Get number of input devices (iscapture = 1)
	int num_devices = SDL_GetNumAudioDevices(1);

	Napi::Array devices = Napi::Array::New(env, num_devices);
	for (int i = 0; i < num_devices; i++) {
		const char* name = SDL_GetAudioDeviceName(i, 1);
		Napi::Object device = Napi::Object::New(env);
		device.Set("id", i);
		device.Set("name", name ? name : "Unknown");
		devices[i] = device;
	}

	return devices;
}

Napi::Value AudioEngine::StartAudioCapture(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	uint32_t node_id = info[0].As<Napi::Number>().Uint32Value();
	int device_index = info.Length() > 1 ? info[1].As<Napi::Number>().Int32Value() : 0;

	// Already capturing
	if (capture_device_id_ != 0) {
		return Napi::Boolean::New(env, false);
	}

	// Store node ID
	capture_node_id_ = node_id;

	// Configure capture spec
	SDL_AudioSpec desired_spec;
	SDL_zero(desired_spec);
	desired_spec.freq = sample_rate_;
	desired_spec.format = AUDIO_F32SYS;
	desired_spec.channels = channels_;
	desired_spec.samples = buffer_size_;
	desired_spec.callback = CaptureCallback;
	desired_spec.userdata = this;

	// Get device name
	const char* device_name = SDL_GetAudioDeviceName(device_index, 1);

	std::cout << "\n=== Starting Audio Capture ===" << std::endl;
	std::cout << "Device: " << (device_name ? device_name : "Default") << std::endl;

	// Open capture device (iscapture = 1)
	capture_device_id_ = SDL_OpenAudioDevice(device_name, 1, &desired_spec, &capture_spec_, 0);
	if (capture_device_id_ == 0) {
		std::cout << "Failed to open capture device: " << SDL_GetError() << std::endl;
		std::cout << "==============================\n" << std::endl;
		return Napi::Boolean::New(env, false);
	}

	std::cout << "  Sample rate: " << capture_spec_.freq << " Hz" << std::endl;
	std::cout << "  Channels: " << (int)capture_spec_.channels << std::endl;
	std::cout << "  Buffer size: " << capture_spec_.samples << " samples" << std::endl;
	std::cout << "==============================\n" << std::endl;

	// Start capturing
	is_capturing_ = true;
	SDL_PauseAudioDevice(capture_device_id_, 0);

	return Napi::Boolean::New(env, true);
}

Napi::Value AudioEngine::StopAudioCapture(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (capture_device_id_ == 0) {
		return env.Undefined();
	}

	// Stop and close
	is_capturing_ = false;
	SDL_CloseAudioDevice(capture_device_id_);
	capture_device_id_ = 0;
	capture_node_id_ = 0;

	return env.Undefined();
}

void AudioEngine::CaptureCallback(void* userdata, Uint8* stream, int len) {
	AudioEngine* engine = static_cast<AudioEngine*>(userdata);
	if (!engine || !engine->is_capturing_) {
		return;
	}

	// Get the MediaStreamSourceNode
	auto node = engine->graph_->GetNode(engine->capture_node_id_);
	if (!node) {
		return;
	}

	auto* source_node = dynamic_cast<MediaStreamSourceNode*>(node);
	if (!source_node) {
		return;
	}

	// Feed captured audio to the node
	float* data = reinterpret_cast<float*>(stream);
	int frame_count = len / (sizeof(float) * engine->capture_spec_.channels);
	source_node->FeedAudioData(data, frame_count);
}

} // namespace webaudio
