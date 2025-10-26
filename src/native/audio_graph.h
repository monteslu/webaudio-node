#ifndef WEBAUDIO_AUDIO_GRAPH_H
#define WEBAUDIO_AUDIO_GRAPH_H

#include <napi.h>
#include <memory>
#include <vector>
#include <map>
#include <mutex>
#include <atomic>
#include "nodes/audio_node.h"

namespace webaudio {

struct Connection {
	uint32_t source_id;
	uint32_t dest_id;
	uint32_t output_index;
	uint32_t input_index;
	std::string param_name;  // Empty for node connections, set for param connections
	bool is_param_connection = false;
};

struct SharedBuffer {
	std::shared_ptr<std::vector<float>> data;
	int length;
	int channels;
};

class AudioGraph {
public:
	AudioGraph(int sample_rate, int channels, int buffer_size);
	~AudioGraph();

	// Node management
	uint32_t CreateNode(const std::string& type, Napi::Object options, Napi::Env env);
	void Connect(uint32_t source_id, uint32_t dest_id, uint32_t output_idx, uint32_t input_idx);
	void ConnectToParam(uint32_t source_id, uint32_t dest_id, const std::string& param_name, uint32_t output_idx);
	void Disconnect(uint32_t source_id, uint32_t dest_id);
	void DisconnectAll(uint32_t source_id);

	// Node control
	void StartNode(uint32_t node_id, double when);
	void StopNode(uint32_t node_id, double when);
	void SetNodeParameter(uint32_t node_id, const std::string& param_name, float value);
	void SetNodeBuffer(uint32_t node_id, float* data, int length, int channels);
	void SetNodeProperty(uint32_t node_id, const std::string& property_name, bool value);

	// Shared buffer management
	void RegisterBuffer(uint32_t buffer_id, float* data, int length, int channels);
	void SetNodeBufferId(uint32_t node_id, uint32_t buffer_id);
	void SetNodeStringProperty(uint32_t node_id, const std::string& property_name, const std::string& value);
	void SetNodePeriodicWave(uint32_t node_id, float* wavetable, int size);
	void ScheduleParameterValue(uint32_t node_id, const std::string& param_name, float value, double time);
	void ScheduleParameterRamp(uint32_t node_id, const std::string& param_name, float value, double time, bool exponential);
	void ScheduleParameterTarget(uint32_t node_id, const std::string& param_name, float target, double time, double time_constant);
	void ScheduleParameterCurve(uint32_t node_id, const std::string& param_name, const std::vector<float>& values, double time, double duration);
	void CancelScheduledParameterValues(uint32_t node_id, const std::string& param_name, double cancel_time);
	void CancelAndHoldParameterAtTime(uint32_t node_id, const std::string& param_name, double cancel_time);

	// Main processing function (called from audio thread)
	void Process(float* output, int frame_count);

	int GetSampleRate() const { return sample_rate_; }
	int GetChannels() const { return channels_; }

	// Get node by ID (for special node types like AnalyserNode)
	AudioNode* GetNode(uint32_t node_id);

	// Get shared buffer by ID
	SharedBuffer* GetSharedBuffer(uint32_t buffer_id);

private:
	int sample_rate_;
	int channels_;
	int buffer_size_;

	std::atomic<uint32_t> next_node_id_{1};
	std::map<uint32_t, std::shared_ptr<AudioNode>> nodes_;
	std::vector<Connection> connections_;
	std::mutex graph_mutex_;

	uint32_t destination_node_id_{0};

	// Time tracking
	std::atomic<uint64_t> current_sample_{0};

	// Shared buffer storage
	std::map<uint32_t, SharedBuffer> shared_buffers_;

	// Scratch buffers for processing (pre-allocated to avoid malloc in audio callback)
	std::vector<float> scratch_buffer_;
	std::vector<float> param_buffer_;  // For param modulation processing

	void ProcessNode(AudioNode* node, int frame_count, uint64_t current_sample);
	void TopologicalSort(std::vector<uint32_t>& sorted_nodes);
	double GetCurrentTime() const { return static_cast<double>(current_sample_.load()) / static_cast<double>(sample_rate_); }
};

} // namespace webaudio

#endif // WEBAUDIO_AUDIO_GRAPH_H
