// WASM AudioGraph Implementation
// Ports audio_graph.cpp to WebAssembly

#include <emscripten.h>
#include <cstring>
#include <vector>
#include <map>
#include <memory>
#include <algorithm>
#include <cmath>

// Audio Node base classes and implementations
#include "../native/nodes/audio_node.h"
#include "../native/nodes/destination_node.h"
#include "../native/nodes/buffer_source_node.h"
#include "../native/nodes/gain_node.h"
#include "../native/nodes/oscillator_node.h"
#include "../native/nodes/biquad_filter_node.h"
#include "../native/nodes/delay_node.h"
#include "../native/nodes/stereo_panner_node.h"
#include "../native/nodes/constant_source_node.h"
#include "../native/nodes/channel_splitter_node.h"
#include "../native/nodes/channel_merger_node.h"
#include "../native/nodes/analyser_node.h"
#include "../native/nodes/dynamics_compressor_node.h"
#include "../native/nodes/wave_shaper_node.h"
#include "../native/nodes/convolver_node.h"
#include "../native/nodes/panner_node.h"

using namespace webaudio;

struct Connection {
    uint32_t source_id;
    uint32_t dest_id;
    uint32_t output_index;
    uint32_t input_index;
    char param_name[64];
    bool is_param_connection;
    bool needs_channel_routing;
};

struct SharedBuffer {
    std::shared_ptr<std::vector<float>> data;
    int length;
    int channels;
};

class WasmAudioGraph {
public:
    int sample_rate_;
    int channels_;
    int buffer_size_;

    uint32_t next_node_id_;
    std::map<uint32_t, std::shared_ptr<AudioNode>> nodes_;
    std::vector<Connection> connections_;

    uint32_t destination_node_id_;
    uint64_t current_sample_;

    std::map<uint32_t, SharedBuffer> shared_buffers_;
    std::vector<float> scratch_buffer_;
    std::vector<float> param_buffer_;

    WasmAudioGraph(int sample_rate, int channels, int buffer_size)
        : sample_rate_(sample_rate)
        , channels_(channels)
        , buffer_size_(buffer_size)
        , next_node_id_(1)
        , destination_node_id_(0)
        , current_sample_(0)
        , scratch_buffer_(buffer_size * channels * 4, 0.0f)
        , param_buffer_(buffer_size * channels, 0.0f) {

        // Create destination node
        auto dest_node = std::make_shared<DestinationNode>(sample_rate, channels);
        destination_node_id_ = next_node_id_++;
        nodes_[destination_node_id_] = dest_node;
    }

    ~WasmAudioGraph() {
        nodes_.clear();
        connections_.clear();
    }

    uint32_t CreateNode(const char* type, const char* options_json = nullptr) {
        std::string type_str(type);
        std::shared_ptr<AudioNode> node;

        if (type_str == "destination") {
            return destination_node_id_;
        } else if (type_str == "bufferSource") {
            node = std::make_shared<BufferSourceNode>(sample_rate_, channels_);
        } else if (type_str == "gain") {
            node = std::make_shared<GainNode>(sample_rate_, channels_);
        } else if (type_str == "oscillator") {
            // Default to sine wave, can be changed later
            node = std::make_shared<OscillatorNode>(sample_rate_, channels_, "sine");
        } else if (type_str == "biquadFilter") {
            node = std::make_shared<BiquadFilterNode>(sample_rate_, channels_, "lowpass");
        } else if (type_str == "delay") {
            node = std::make_shared<DelayNode>(sample_rate_, channels_, 1.0f);
        } else if (type_str == "stereoPanner") {
            node = std::make_shared<StereoPannerNode>(sample_rate_, channels_);
        } else if (type_str == "constantSource") {
            node = std::make_shared<ConstantSourceNode>(sample_rate_, channels_);
        } else if (type_str == "channelSplitter") {
            node = std::make_shared<ChannelSplitterNode>(sample_rate_, channels_, channels_);
        } else if (type_str == "channelMerger") {
            node = std::make_shared<ChannelMergerNode>(sample_rate_, channels_, channels_);
        } else if (type_str == "analyser") {
            node = std::make_shared<AnalyserNode>(sample_rate_, channels_);
        } else if (type_str == "dynamicsCompressor") {
            node = std::make_shared<DynamicsCompressorNode>(sample_rate_, channels_);
        } else if (type_str == "waveShaper") {
            node = std::make_shared<WaveShaperNode>(sample_rate_, channels_);
        } else if (type_str == "convolver") {
            node = std::make_shared<ConvolverNode>(sample_rate_, channels_);
        } else if (type_str == "panner") {
            node = std::make_shared<PannerNode>(sample_rate_, channels_);
        } else {
            return 0; // Unknown node type
        }

        uint32_t node_id = next_node_id_++;
        nodes_[node_id] = node;
        return node_id;
    }

    void Connect(uint32_t source_id, uint32_t dest_id, uint32_t output_idx, uint32_t input_idx) {
        auto source_it = nodes_.find(source_id);
        auto dest_it = nodes_.find(dest_id);

        if (source_it == nodes_.end() || dest_it == nodes_.end()) {
            return;
        }

        Connection conn;
        conn.source_id = source_id;
        conn.dest_id = dest_id;
        conn.output_index = output_idx;
        conn.input_index = input_idx;
        conn.param_name[0] = '\0';
        conn.is_param_connection = false;
        conn.needs_channel_routing = (output_idx > 0 || input_idx > 0);

        connections_.push_back(conn);

        source_it->second->AddOutput(dest_it->second.get());
        dest_it->second->AddInput(source_it->second.get(), output_idx, input_idx);

        // Handle ChannelSplitter and ChannelMerger
        ChannelSplitterNode* splitter = dynamic_cast<ChannelSplitterNode*>(source_it->second.get());
        if (splitter) {
            splitter->SetOutputChannelMapping(dest_it->second.get(), output_idx);
        }

        ChannelMergerNode* merger = dynamic_cast<ChannelMergerNode*>(dest_it->second.get());
        if (merger) {
            merger->SetInputChannelMapping(source_it->second.get(), input_idx);
        }
    }

    void ConnectToParam(uint32_t source_id, uint32_t dest_id, const char* param_name, uint32_t output_idx) {
        auto source_it = nodes_.find(source_id);
        auto dest_it = nodes_.find(dest_id);

        if (source_it == nodes_.end() || dest_it == nodes_.end()) {
            return;
        }

        Connection conn;
        conn.source_id = source_id;
        conn.dest_id = dest_id;
        conn.output_index = output_idx;
        conn.input_index = 0;
        strncpy(conn.param_name, param_name, 63);
        conn.param_name[63] = '\0';
        conn.is_param_connection = true;
        conn.needs_channel_routing = false;

        connections_.push_back(conn);
    }

    void Disconnect(uint32_t source_id, uint32_t dest_id) {
        auto source_it = nodes_.find(source_id);
        auto dest_it = nodes_.find(dest_id);

        if (source_it == nodes_.end() || dest_it == nodes_.end()) {
            return;
        }

        connections_.erase(
            std::remove_if(connections_.begin(), connections_.end(),
                [source_id, dest_id](const Connection& conn) {
                    return conn.source_id == source_id && conn.dest_id == dest_id;
                }),
            connections_.end()
        );

        source_it->second->RemoveOutput(dest_it->second.get());
        dest_it->second->RemoveInput(source_it->second.get());
    }

    void StartNode(uint32_t node_id, double when) {
        auto it = nodes_.find(node_id);
        if (it != nodes_.end()) {
            it->second->Start(when);
        }
    }

    void StopNode(uint32_t node_id, double when) {
        auto it = nodes_.find(node_id);
        if (it != nodes_.end()) {
            it->second->Stop(when);
        }
    }

    void SetNodeParameter(uint32_t node_id, const char* param_name, float value) {
        auto it = nodes_.find(node_id);
        if (it != nodes_.end()) {
            it->second->SetParameter(param_name, value);
        }
    }

    void SetNodeBuffer(uint32_t node_id, float* data, int length, int channels) {
        auto it = nodes_.find(node_id);
        if (it == nodes_.end()) return;

        BufferSourceNode* buffer_node = dynamic_cast<BufferSourceNode*>(it->second.get());
        if (buffer_node) {
            buffer_node->SetBuffer(data, length, channels);
            return;
        }

        ConvolverNode* convolver_node = dynamic_cast<ConvolverNode*>(it->second.get());
        if (convolver_node) {
            convolver_node->SetBuffer(data, length, channels);
        }
    }

    void RegisterBuffer(uint32_t buffer_id, float* data, int length, int channels) {
        auto buffer_data = std::make_shared<std::vector<float>>(length * channels);
        std::memcpy(buffer_data->data(), data, length * channels * sizeof(float));

        SharedBuffer shared_buffer;
        shared_buffer.data = buffer_data;
        shared_buffer.length = length;
        shared_buffer.channels = channels;

        shared_buffers_[buffer_id] = shared_buffer;
    }

    void SetNodeBufferId(uint32_t node_id, uint32_t buffer_id) {
        auto buffer_it = shared_buffers_.find(buffer_id);
        if (buffer_it == shared_buffers_.end()) {
            return;
        }

        auto node_it = nodes_.find(node_id);
        if (node_it != nodes_.end()) {
            BufferSourceNode* buffer_node = dynamic_cast<BufferSourceNode*>(node_it->second.get());
            if (buffer_node) {
                buffer_node->SetSharedBuffer(buffer_it->second.data, buffer_it->second.length, buffer_it->second.channels);
            }
        }
    }

    void SetNodeStringProperty(uint32_t node_id, const char* property_name, const char* value) {
        auto it = nodes_.find(node_id);
        if (it == nodes_.end()) return;

        std::string prop(property_name);
        std::string val(value);

        // Handle PannerNode properties
        PannerNode* panner = dynamic_cast<PannerNode*>(it->second.get());
        if (panner) {
            if (prop == "distanceModel") {
                panner->SetDistanceModel(val);
            } else if (prop == "panningModel") {
                panner->SetPanningModel(val);
            }
        }

        // Note: Oscillator and Filter types are set in constructor,
        // not changed after creation (per WebAudio spec)
    }

    void SetWaveShaperCurve(uint32_t node_id, float* curve, int length) {
        auto it = nodes_.find(node_id);
        if (it == nodes_.end()) return;

        WaveShaperNode* wave_shaper = dynamic_cast<WaveShaperNode*>(it->second.get());
        if (wave_shaper) {
            wave_shaper->SetCurve(curve, length);
        }
    }

    void SetNodePeriodicWave(uint32_t node_id, float* wavetable, int length) {
        auto it = nodes_.find(node_id);
        if (it == nodes_.end()) return;

        OscillatorNode* oscillator = dynamic_cast<OscillatorNode*>(it->second.get());
        if (oscillator) {
            oscillator->SetPeriodicWave(wavetable, length);
        }
    }

    void ScheduleParameterValue(uint32_t node_id, const char* param_name, float value, double time) {
        auto it = nodes_.find(node_id);
        if (it != nodes_.end()) {
            it->second->ScheduleParameterValue(param_name, value, time);
        }
    }

    void ScheduleParameterRamp(uint32_t node_id, const char* param_name, float value, double time, bool exponential) {
        auto it = nodes_.find(node_id);
        if (it != nodes_.end()) {
            it->second->ScheduleParameterRamp(param_name, value, time, exponential);
        }
    }

    // MAIN PROCESSING FUNCTION - Lock-free graph processing
    void Process(float* output, int frame_count) {
        // Calculate current time
        double current_time = static_cast<double>(current_sample_) / static_cast<double>(sample_rate_);

        // Update current time for all nodes
        for (auto& pair : nodes_) {
            pair.second->SetCurrentTime(current_time);
        }

        // Check if we have param connections (cached)
        static bool has_param_connections_cached = false;
        static size_t last_connections_size = 0;
        if (connections_.size() != last_connections_size) {
            has_param_connections_cached = false;
            for (const auto& conn : connections_) {
                if (conn.is_param_connection) {
                    has_param_connections_cached = true;
                    break;
                }
            }
            last_connections_size = connections_.size();
        }

        if (has_param_connections_cached) {
            // Clear AudioParam modulation inputs
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

            // Process param connections
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

                        AudioParam* param = dest_node->GetAudioParam(conn.param_name);
                        if (param && source_node->IsActive()) {
                            std::memset(param_buffer_.data(), 0, param_buffer_size * sizeof(float));
                            source_node->Process(param_buffer_.data(), frame_count);
                            param->AddModulationInput(param_buffer_.data(), frame_count);
                        }
                    }
                }
            }
        }

        // Get destination node
        auto dest_it = nodes_.find(destination_node_id_);
        if (dest_it == nodes_.end()) {
            std::memset(output, 0, frame_count * channels_ * sizeof(float));
            return;
        }

        DestinationNode* dest_node = dynamic_cast<DestinationNode*>(dest_it->second.get());
        if (!dest_node) {
            std::memset(output, 0, frame_count * channels_ * sizeof(float));
            return;
        }

        // Process destination node (pulls from inputs)
        dest_node->Process(output, frame_count);

        // Increment sample counter
        current_sample_ += frame_count;
    }

    double GetCurrentTime() const {
        return static_cast<double>(current_sample_) / static_cast<double>(sample_rate_);
    }
};

// Global graph instance map
static std::map<uint32_t, WasmAudioGraph*> graphs_;
static uint32_t next_graph_id_ = 1;

// C API for JavaScript
extern "C" {

EMSCRIPTEN_KEEPALIVE
uint32_t createAudioGraph(int sample_rate, int channels, int buffer_size) {
    WasmAudioGraph* graph = new WasmAudioGraph(sample_rate, channels, buffer_size);
    uint32_t graph_id = next_graph_id_++;
    graphs_[graph_id] = graph;
    return graph_id;
}

EMSCRIPTEN_KEEPALIVE
void destroyAudioGraph(uint32_t graph_id) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        delete it->second;
        graphs_.erase(it);
    }
}

EMSCRIPTEN_KEEPALIVE
uint32_t createNode(uint32_t graph_id, const char* type) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        return it->second->CreateNode(type);
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE
void connectNodes(uint32_t graph_id, uint32_t source_id, uint32_t dest_id, uint32_t output_idx, uint32_t input_idx) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->Connect(source_id, dest_id, output_idx, input_idx);
    }
}

EMSCRIPTEN_KEEPALIVE
void connectToParam(uint32_t graph_id, uint32_t source_id, uint32_t dest_id, const char* param_name, uint32_t output_idx) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->ConnectToParam(source_id, dest_id, param_name, output_idx);
    }
}

EMSCRIPTEN_KEEPALIVE
void disconnectNodes(uint32_t graph_id, uint32_t source_id, uint32_t dest_id) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->Disconnect(source_id, dest_id);
    }
}

EMSCRIPTEN_KEEPALIVE
void startNode(uint32_t graph_id, uint32_t node_id, double when) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->StartNode(node_id, when);
    }
}

EMSCRIPTEN_KEEPALIVE
void stopNode(uint32_t graph_id, uint32_t node_id, double when) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->StopNode(node_id, when);
    }
}

EMSCRIPTEN_KEEPALIVE
void setNodeParameter(uint32_t graph_id, uint32_t node_id, const char* param_name, float value) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->SetNodeParameter(node_id, param_name, value);
    }
}

EMSCRIPTEN_KEEPALIVE
void setNodeBuffer(uint32_t graph_id, uint32_t node_id, float* data, int length, int channels) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->SetNodeBuffer(node_id, data, length, channels);
    }
}

EMSCRIPTEN_KEEPALIVE
void registerBuffer(uint32_t graph_id, uint32_t buffer_id, float* data, int length, int channels) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->RegisterBuffer(buffer_id, data, length, channels);
    }
}

EMSCRIPTEN_KEEPALIVE
void setNodeBufferId(uint32_t graph_id, uint32_t node_id, uint32_t buffer_id) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->SetNodeBufferId(node_id, buffer_id);
    }
}

EMSCRIPTEN_KEEPALIVE
void setNodeStringProperty(uint32_t graph_id, uint32_t node_id, const char* property_name, const char* value) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->SetNodeStringProperty(node_id, property_name, value);
    }
}

EMSCRIPTEN_KEEPALIVE
void scheduleParameterValue(uint32_t graph_id, uint32_t node_id, const char* param_name, float value, double time) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->ScheduleParameterValue(node_id, param_name, value, time);
    }
}

EMSCRIPTEN_KEEPALIVE
void scheduleParameterRamp(uint32_t graph_id, uint32_t node_id, const char* param_name, float value, double time, bool exponential) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->ScheduleParameterRamp(node_id, param_name, value, time, exponential);
    }
}

EMSCRIPTEN_KEEPALIVE
void processGraph(uint32_t graph_id, float* output, int frame_count) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->Process(output, frame_count);
    }
}

EMSCRIPTEN_KEEPALIVE
double getCurrentTime(uint32_t graph_id) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        return it->second->GetCurrentTime();
    }
    return 0.0;
}

EMSCRIPTEN_KEEPALIVE
void setWaveShaperCurve(uint32_t graph_id, uint32_t node_id, float* curve, int length) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->SetWaveShaperCurve(node_id, curve, length);
    }
}

EMSCRIPTEN_KEEPALIVE
void setNodeProperty(uint32_t graph_id, uint32_t node_id, const char* property, float value) {
    // Alias for setNodeParameter for compatibility
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->SetNodeParameter(node_id, property, value);
    }
}

EMSCRIPTEN_KEEPALIVE
void setNodePeriodicWave(uint32_t graph_id, uint32_t node_id, float* wavetable, int length) {
    auto it = graphs_.find(graph_id);
    if (it != graphs_.end()) {
        it->second->SetNodePeriodicWave(node_id, wavetable, length);
    }
}

} // extern "C"
