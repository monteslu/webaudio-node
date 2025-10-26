#include "audio_graph.h"
#include "nodes/destination_node.h"
#include "nodes/buffer_source_node.h"
#include "nodes/gain_node.h"
#include "nodes/oscillator_node.h"
#include "nodes/biquad_filter_node.h"
#include "nodes/delay_node.h"
#include "nodes/stereo_panner_node.h"
#include "nodes/constant_source_node.h"
#include "nodes/channel_splitter_node.h"
#include "nodes/channel_merger_node.h"
#include "nodes/analyser_node.h"
#include "nodes/dynamics_compressor_node.h"
#include "nodes/wave_shaper_node.h"
#include "nodes/iir_filter_node.h"
#include "nodes/convolver_node.h"
#include "nodes/panner_node.h"
#include "nodes/audio_worklet_node.h"
#include "nodes/media_stream_source_node.h"
#include <algorithm>
#include <cstring>
#include <iostream>
#include <set>

namespace webaudio {

AudioGraph::AudioGraph(int sample_rate, int channels, int buffer_size)
	: sample_rate_(sample_rate)
	, channels_(channels)
	, buffer_size_(buffer_size)
	, scratch_buffer_(buffer_size * channels * 4, 0.0f)  // Extra space for mixing
	, param_buffer_(buffer_size * channels, 0.0f) {      // Pre-allocate for param modulation

	// Create destination node automatically
	auto dest_node = std::make_shared<DestinationNode>(sample_rate, channels);
	uint32_t dest_id = next_node_id_++;
	destination_node_id_.store(dest_id, std::memory_order_release);
	nodes_[dest_id] = dest_node;
}

AudioGraph::~AudioGraph() {
	std::lock_guard<std::mutex> lock(graph_mutex_);
	nodes_.clear();
	connections_.clear();
}

uint32_t AudioGraph::CreateNode(const std::string& type, Napi::Object options, Napi::Env env) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	std::shared_ptr<AudioNode> node;

	if (type == "destination") {
		// Return existing destination node
		return destination_node_id_;
	} else if (type == "bufferSource") {
		node = std::make_shared<BufferSourceNode>(sample_rate_, channels_);
	} else if (type == "gain") {
		node = std::make_shared<GainNode>(sample_rate_, channels_);
	} else if (type == "oscillator") {
		std::string waveform = options.Has("type") ? options.Get("type").As<Napi::String>().Utf8Value() : "sine";
		node = std::make_shared<OscillatorNode>(sample_rate_, channels_, waveform);
	} else if (type == "biquadFilter") {
		std::string filter_type = options.Has("type") ? options.Get("type").As<Napi::String>().Utf8Value() : "lowpass";
		node = std::make_shared<BiquadFilterNode>(sample_rate_, channels_, filter_type);
	} else if (type == "delay") {
		float max_delay = options.Has("maxDelayTime") ? options.Get("maxDelayTime").As<Napi::Number>().FloatValue() : 1.0f;
		node = std::make_shared<DelayNode>(sample_rate_, channels_, max_delay);
	} else if (type == "stereoPanner") {
		node = std::make_shared<StereoPannerNode>(sample_rate_, channels_);
	} else if (type == "constantSource") {
		node = std::make_shared<ConstantSourceNode>(sample_rate_, channels_);
	} else if (type == "channelSplitter") {
		int number_of_outputs = options.Has("numberOfOutputs") ? options.Get("numberOfOutputs").As<Napi::Number>().Int32Value() : channels_;
		node = std::make_shared<ChannelSplitterNode>(sample_rate_, channels_, number_of_outputs);
	} else if (type == "channelMerger") {
		int number_of_inputs = options.Has("numberOfInputs") ? options.Get("numberOfInputs").As<Napi::Number>().Int32Value() : channels_;
		node = std::make_shared<ChannelMergerNode>(sample_rate_, channels_, number_of_inputs);
	} else if (type == "analyser") {
		node = std::make_shared<AnalyserNode>(sample_rate_, channels_);
	} else if (type == "dynamicsCompressor") {
		node = std::make_shared<DynamicsCompressorNode>(sample_rate_, channels_);
	} else if (type == "waveShaper") {
		node = std::make_shared<WaveShaperNode>(sample_rate_, channels_);
	} else if (type == "IIRFilter") {
		// Extract feedforward and feedback coefficients
		std::vector<float> feedforward, feedback;

		if (options.Has("feedforward")) {
			Napi::Array ff_array = options.Get("feedforward").As<Napi::Array>();
			for (uint32_t i = 0; i < ff_array.Length(); ++i) {
				feedforward.push_back(ff_array.Get(i).As<Napi::Number>().FloatValue());
			}
		}

		if (options.Has("feedback")) {
			Napi::Array fb_array = options.Get("feedback").As<Napi::Array>();
			for (uint32_t i = 0; i < fb_array.Length(); ++i) {
				feedback.push_back(fb_array.Get(i).As<Napi::Number>().FloatValue());
			}
		}

		if (!feedforward.empty() && !feedback.empty()) {
			node = std::make_shared<IIRFilterNode>(sample_rate_, channels_, feedforward, feedback);
		} else {
			return 0; // Invalid IIR filter (missing coefficients)
		}
	} else if (type == "convolver") {
		node = std::make_shared<ConvolverNode>(sample_rate_, channels_);
	} else if (type == "panner") {
		node = std::make_shared<PannerNode>(sample_rate_, channels_);
	} else if (type == "audioworklet") {
		std::string processor_name = options.Has("processorName") ? options.Get("processorName").As<Napi::String>().Utf8Value() : "";
		if (processor_name.empty()) {
			return 0; // Invalid: processorName is required
		}
		node = std::make_shared<AudioWorkletNode>(sample_rate_, channels_, processor_name);
	} else if (type == "mediaStreamSource") {
		node = std::make_shared<MediaStreamSourceNode>(sample_rate_, channels_);
	} else {
		// Unknown node type
		return 0;
	}

	uint32_t node_id = next_node_id_++;
	nodes_[node_id] = node;

	return node_id;
}

void AudioGraph::Connect(uint32_t source_id, uint32_t dest_id, uint32_t output_idx, uint32_t input_idx) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto source_it = nodes_.find(source_id);
	auto dest_it = nodes_.find(dest_id);

	if (source_it == nodes_.end() || dest_it == nodes_.end()) {
		return;
	}

	// Create connection with channel routing info
	Connection conn;
	conn.source_id = source_id;
	conn.dest_id = dest_id;
	conn.output_index = output_idx;
	conn.input_index = input_idx;
	conn.param_name = "";
	conn.is_param_connection = false;
	conn.needs_channel_routing = (output_idx > 0 || input_idx > 0);

	connections_.push_back(conn);

	// Update node connections - NOW WITH PORT INFO!
	source_it->second->AddOutput(dest_it->second.get());
	dest_it->second->AddInput(source_it->second.get(), output_idx, input_idx);

	// Special handling for ChannelSplitter and ChannelMerger nodes
	// These nodes need to know about channel routing

	// If source is a ChannelSplitter, inform it which channel this output wants
	ChannelSplitterNode* splitter = dynamic_cast<ChannelSplitterNode*>(source_it->second.get());
	if (splitter) {
		splitter->SetOutputChannelMapping(dest_it->second.get(), output_idx);
	}

	// If dest is a ChannelMerger, inform it which input channel this connection provides
	ChannelMergerNode* merger = dynamic_cast<ChannelMergerNode*>(dest_it->second.get());
	if (merger) {
		merger->SetInputChannelMapping(source_it->second.get(), input_idx);
	}
}

void AudioGraph::ConnectToParam(uint32_t source_id, uint32_t dest_id, const std::string& param_name, uint32_t output_idx) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto source_it = nodes_.find(source_id);
	auto dest_it = nodes_.find(dest_id);

	if (source_it == nodes_.end() || dest_it == nodes_.end()) {
		return;
	}

	// Add param connection
	Connection conn;
	conn.source_id = source_id;
	conn.dest_id = dest_id;
	conn.output_index = output_idx;
	conn.input_index = 0;  // Not used for param connections
	conn.param_name = param_name;
	conn.is_param_connection = true;
	connections_.push_back(conn);
}

void AudioGraph::Disconnect(uint32_t source_id, uint32_t dest_id) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto source_it = nodes_.find(source_id);
	auto dest_it = nodes_.find(dest_id);

	if (source_it == nodes_.end() || dest_it == nodes_.end()) {
		return;
	}

	// Remove connections
	connections_.erase(
		std::remove_if(connections_.begin(), connections_.end(),
			[source_id, dest_id](const Connection& conn) {
				return conn.source_id == source_id && conn.dest_id == dest_id;
			}),
		connections_.end()
	);

	// Update node connections
	source_it->second->RemoveOutput(dest_it->second.get());
	dest_it->second->RemoveInput(source_it->second.get());
}

void AudioGraph::DisconnectAll(uint32_t source_id) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto source_it = nodes_.find(source_id);
	if (source_it == nodes_.end()) {
		return;
	}

	// Remove all connections from this source
	connections_.erase(
		std::remove_if(connections_.begin(), connections_.end(),
			[source_id](const Connection& conn) {
				return conn.source_id == source_id;
			}),
		connections_.end()
	);

	// Clear outputs
	source_it->second->ClearOutputs();
}

void AudioGraph::StartNode(uint32_t node_id, double when) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->Start(when);
	}
}

void AudioGraph::StopNode(uint32_t node_id, double when) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->Stop(when);
	}
}

void AudioGraph::SetNodeParameter(uint32_t node_id, const std::string& param_name, float value) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		// Try PannerNode for non-AudioParam properties
		PannerNode* panner_node = dynamic_cast<PannerNode*>(it->second.get());
		if (panner_node) {
			// AudioParam properties (positionX/Y/Z, orientationX/Y/Z) are handled via SetParameter
			if (param_name == "refDistance") panner_node->SetRefDistance(value);
			else if (param_name == "maxDistance") panner_node->SetMaxDistance(value);
			else if (param_name == "rolloffFactor") panner_node->SetRolloffFactor(value);
			else if (param_name == "coneInnerAngle") panner_node->SetConeInnerAngle(value);
			else if (param_name == "coneOuterAngle") panner_node->SetConeOuterAngle(value);
			else if (param_name == "coneOuterGain") panner_node->SetConeOuterGain(value);
			else it->second->SetParameter(param_name, value);  // Try AudioParam
			return;
		}

		// Default parameter handling
		it->second->SetParameter(param_name, value);
	}
}

void AudioGraph::SetNodeBuffer(uint32_t node_id, float* data, int length, int channels) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		// Try BufferSourceNode
		BufferSourceNode* buffer_node = dynamic_cast<BufferSourceNode*>(it->second.get());
		if (buffer_node) {
			buffer_node->SetBuffer(data, length, channels);
			return;
		}

		// Try ConvolverNode
		ConvolverNode* convolver_node = dynamic_cast<ConvolverNode*>(it->second.get());
		if (convolver_node) {
			convolver_node->SetBuffer(data, length, channels);
			return;
		}
	}
}

void AudioGraph::RegisterBuffer(uint32_t buffer_id, float* data, int length, int channels) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	// Create shared buffer
	auto buffer_data = std::make_shared<std::vector<float>>(length * channels);
	std::memcpy(buffer_data->data(), data, length * channels * sizeof(float));

	SharedBuffer shared_buffer;
	shared_buffer.data = buffer_data;
	shared_buffer.length = length;
	shared_buffer.channels = channels;

	shared_buffers_[buffer_id] = shared_buffer;
}

void AudioGraph::SetNodeBufferId(uint32_t node_id, uint32_t buffer_id) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto buffer_it = shared_buffers_.find(buffer_id);
	if (buffer_it == shared_buffers_.end()) {
		return; // Buffer not registered
	}

	auto node_it = nodes_.find(node_id);
	if (node_it != nodes_.end()) {
		BufferSourceNode* buffer_node = dynamic_cast<BufferSourceNode*>(node_it->second.get());
		if (buffer_node) {
			buffer_node->SetSharedBuffer(buffer_it->second.data, buffer_it->second.length, buffer_it->second.channels);
		}
	}
}

SharedBuffer* AudioGraph::GetSharedBuffer(uint32_t buffer_id) {
	auto it = shared_buffers_.find(buffer_id);
	if (it != shared_buffers_.end()) {
		return &it->second;
	}
	return nullptr;
}

void AudioGraph::SetNodeProperty(uint32_t node_id, const std::string& property_name, bool value) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		// Try ConvolverNode
		ConvolverNode* convolver_node = dynamic_cast<ConvolverNode*>(it->second.get());
		if (convolver_node && property_name == "normalize") {
			convolver_node->SetNormalize(value);
			return;
		}
	}
}

void AudioGraph::SetNodeStringProperty(uint32_t node_id, const std::string& property_name, const std::string& value) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		// Try PannerNode
		PannerNode* panner_node = dynamic_cast<PannerNode*>(it->second.get());
		if (panner_node) {
			if (property_name == "distanceModel") {
				panner_node->SetDistanceModel(value);
			} else if (property_name == "panningModel") {
				panner_node->SetPanningModel(value);
			}
			return;
		}
	}
}

void AudioGraph::SetNodePeriodicWave(uint32_t node_id, float* wavetable, int size) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		OscillatorNode* osc_node = dynamic_cast<OscillatorNode*>(it->second.get());
		if (osc_node) {
			osc_node->SetPeriodicWave(wavetable, size);
		}
	}
}

void AudioGraph::ScheduleParameterValue(uint32_t node_id, const std::string& param_name, float value, double time) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->ScheduleParameterValue(param_name, value, time);
	}
}

void AudioGraph::ScheduleParameterRamp(uint32_t node_id, const std::string& param_name, float value, double time, bool exponential) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->ScheduleParameterRamp(param_name, value, time, exponential);
	}
}

void AudioGraph::ScheduleParameterTarget(uint32_t node_id, const std::string& param_name, float target, double time, double time_constant) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->ScheduleParameterTarget(param_name, target, time, time_constant);
	}
}

void AudioGraph::ScheduleParameterCurve(uint32_t node_id, const std::string& param_name, const std::vector<float>& values, double time, double duration) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->ScheduleParameterCurve(param_name, values, time, duration);
	}
}

void AudioGraph::CancelScheduledParameterValues(uint32_t node_id, const std::string& param_name, double cancel_time) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->CancelScheduledParameterValues(param_name, cancel_time);
	}
}

void AudioGraph::CancelAndHoldParameterAtTime(uint32_t node_id, const std::string& param_name, double cancel_time) {
	std::lock_guard<std::mutex> lock(graph_mutex_);

	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		it->second->CancelAndHoldParameterAtTime(param_name, cancel_time, sample_rate_);
	}
}

void AudioGraph::Process(float* output, int frame_count) {
	// NO LOCK in audio callback! (graph modifications are protected separately)
	// This is safe because:
	// 1. Nodes are never deleted, only deactivated
	// 2. Connections are read-only during playback
	// 3. Destination node ID is set at construction

	// Calculate current time
	double current_time = GetCurrentTime();

	// Update current time for all nodes
	// Needed for BufferSourceNode scheduling and other time-dependent nodes
	for (auto& pair : nodes_) {
		pair.second->SetCurrentTime(current_time);
	}

	// Skip output buffer clear - DestinationNode::Process() clears it anyway

	// Fast path: Skip param processing entirely if no param connections exist
	// Cache this check result to avoid iterating connections every quantum
	static bool has_param_connections_cached = false;
	static size_t last_connections_size = 0;
	if (connections_.size() != last_connections_size) {
		// Connections changed, recompute
		has_param_connections_cached = false;
		for (const auto& conn : connections_) {
			if (conn.is_param_connection) {
				has_param_connections_cached = true;
				break;
			}
		}
		last_connections_size = connections_.size();
	}
	bool has_param_connections = has_param_connections_cached;

	if (has_param_connections) {
		// Clear all AudioParam modulation inputs for params that have connections
		// Note: We iterate connections directly instead of building a set (faster)
		for (const auto& conn : connections_) {
			if (conn.is_param_connection) {
				auto node_it = nodes_.find(conn.dest_id);
				if (node_it != nodes_.end()) {
					AudioParam* param = node_it->second->GetAudioParam(conn.param_name);
					if (param) {
						param->ClearModulationInputs();
					}
				}
			}
		}
	}

	if (has_param_connections) {
		// Process param connections (modulation sources)
		// Use pre-allocated buffer (no malloc in audio callback!)
		int param_buffer_size = frame_count * channels_;
		if (param_buffer_.size() < static_cast<size_t>(param_buffer_size)) {
			param_buffer_.resize(param_buffer_size, 0.0f);
		}

		for (const auto& conn : connections_) {
			if (conn.is_param_connection) {
				auto source_it = nodes_.find(conn.source_id);
				auto dest_it = nodes_.find(conn.dest_id);

				if (source_it != nodes_.end() && dest_it != nodes_.end()) {
					AudioNode* source_node = source_it->second.get();
					AudioNode* dest_node = dest_it->second.get();

					// Get the AudioParam from the destination node
					AudioParam* param = dest_node->GetAudioParam(conn.param_name);
					if (param && source_node->IsActive()) {
						// Process source node into pre-allocated buffer
						std::memset(param_buffer_.data(), 0, param_buffer_size * sizeof(float));
						source_node->Process(param_buffer_.data(), frame_count);

						// Add to param's modulation input
						param->AddModulationInput(param_buffer_.data(), frame_count);
					}
				}
			}
		}
	}

	// Get destination node (lock-free read)
	uint32_t dest_id = destination_node_id_.load(std::memory_order_acquire);
	auto dest_it = nodes_.find(dest_id);
	if (dest_it == nodes_.end()) {
		return;
	}

	DestinationNode* dest_node = dynamic_cast<DestinationNode*>(dest_it->second.get());
	if (!dest_node) {
		return;
	}

	// Process destination node (which pulls from inputs) - NO LOCK!
	dest_node->Process(output, frame_count);

	// Increment sample counter
	current_sample_ += frame_count;
}

void AudioGraph::TopologicalSort(std::vector<uint32_t>& sorted_nodes) {
	// Simple topological sort for processing order
	// This is a simplified version - a real implementation would need cycle detection

	std::map<uint32_t, int> in_degree;
	for (auto& pair : nodes_) {
		in_degree[pair.first] = 0;
	}

	for (auto& conn : connections_) {
		in_degree[conn.dest_id]++;
	}

	std::vector<uint32_t> queue;
	for (auto& pair : in_degree) {
		if (pair.second == 0) {
			queue.push_back(pair.first);
		}
	}

	while (!queue.empty()) {
		uint32_t node_id = queue.back();
		queue.pop_back();
		sorted_nodes.push_back(node_id);

		for (auto& conn : connections_) {
			if (conn.source_id == node_id) {
				in_degree[conn.dest_id]--;
				if (in_degree[conn.dest_id] == 0) {
					queue.push_back(conn.dest_id);
				}
			}
		}
	}
}

AudioNode* AudioGraph::GetNode(uint32_t node_id) {
	std::lock_guard<std::mutex> lock(graph_mutex_);
	auto it = nodes_.find(node_id);
	if (it != nodes_.end()) {
		return it->second.get();
	}
	return nullptr;
}

} // namespace webaudio
