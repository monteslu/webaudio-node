// Simplified WASM AudioGraph - Direct processing using external node functions
// Calls actual SIMD-optimized node processing from separate files

#include <emscripten.h>
#include <cstring>
#include <vector>
#include <map>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Simple oscillator implementation with SIMD
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

// External node processing functions
struct OscillatorNodeState;
struct GainNodeState;
struct BufferSourceNodeState;

extern "C" {
    OscillatorNodeState* createOscillatorNode(int sample_rate, int channels, int wave_type);
    void destroyOscillatorNode(OscillatorNodeState* state);
    void startOscillator(OscillatorNodeState* state);
    void stopOscillator(OscillatorNodeState* state);
    void processOscillatorNode(OscillatorNodeState* state, float* output, int frame_count, float frequency, float detune);

    GainNodeState* createGainNode(int sample_rate, int channels);
    void destroyGainNode(GainNodeState* state);
    void processGainNode(GainNodeState* state, float* input, float* output, int frame_count, float gain, bool has_input);

    BufferSourceNodeState* createBufferSourceNode(int sample_rate, int channels);
    void destroyBufferSourceNode(BufferSourceNodeState* state);
    void setBufferSourceBuffer(BufferSourceNodeState* state, float* buffer_data, int buffer_frames, int buffer_channels);
    void startBufferSource(BufferSourceNodeState* state);
    void stopBufferSource(BufferSourceNodeState* state);
    void setBufferSourceLoop(BufferSourceNodeState* state, bool loop);
    void processBufferSourceNode(BufferSourceNodeState* state, float* output, int frame_count);
}

struct NodeState {
    float frequency;  // oscillator
    float detune;     // oscillator
    float gain;       // gain

    // Pointers to external node states
    OscillatorNodeState* osc_state;
    GainNodeState* gain_state;
    BufferSourceNodeState* buffer_source_state;
};

struct Node {
    int type; // 0=destination, 1=oscillator, 2=gain, 3=buffer_source
    NodeState* state;
};

struct BufferData {
    float* data;
    int frames;
    int channels;
};

struct AudioGraph {
    int sample_rate;
    int channels;
    std::map<int, Node> nodes;
    std::map<int, std::vector<int>> connections; // dest_id -> list of source_ids
    std::map<int, BufferData> buffers; // buffer_id -> buffer data
    int next_id;
    int dest_id;
};

static std::map<int, AudioGraph*> graphs;
static int next_graph_id = 1;

extern "C" {

EMSCRIPTEN_KEEPALIVE
int createAudioGraph(int sample_rate, int channels, int buffer_size) {
    AudioGraph* graph = new AudioGraph();
    graph->sample_rate = sample_rate;
    graph->channels = channels;
    graph->next_id = 1;

    // Create destination
    Node dest;
    dest.type = 0;
    dest.state = nullptr;
    graph->nodes[graph->next_id] = dest;
    graph->dest_id = graph->next_id;
    graph->next_id++;

    int graph_id = next_graph_id++;
    graphs[graph_id] = graph;
    return graph_id;
}

EMSCRIPTEN_KEEPALIVE
void destroyAudioGraph(int graph_id) {
    auto it = graphs.find(graph_id);
    if (it != graphs.end()) {
        AudioGraph* graph = it->second;

        // Free all node states
        for (auto& pair : graph->nodes) {
            Node& node = pair.second;
            if (node.state) {
                // Destroy external node states
                if (node.state->osc_state) {
                    destroyOscillatorNode(node.state->osc_state);
                }
                if (node.state->gain_state) {
                    destroyGainNode(node.state->gain_state);
                }
                if (node.state->buffer_source_state) {
                    destroyBufferSourceNode(node.state->buffer_source_state);
                }
                delete node.state;
            }
        }

        // Free all registered buffers
        // Note: buffer data is owned by WASM heap, not freed here

        delete graph;
        graphs.erase(it);
    }
}

EMSCRIPTEN_KEEPALIVE
int createNode(int graph_id, const char* type_str) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return 0;

    AudioGraph* graph = it->second;
    std::string type(type_str);

    if (type == "destination") {
        return graph->dest_id;
    }

    Node node;

    if (type == "oscillator") {
        node.type = 1;
        NodeState* state = new NodeState();
        state->frequency = 440.0f;
        state->detune = 0.0f;
        state->gain = 1.0f;
        state->osc_state = createOscillatorNode(graph->sample_rate, graph->channels, 2); // sawtooth
        state->gain_state = nullptr;
        state->buffer_source_state = nullptr;
        node.state = state;
    } else if (type == "gain") {
        node.type = 2;
        NodeState* state = new NodeState();
        state->frequency = 440.0f;
        state->detune = 0.0f;
        state->gain = 1.0f;
        state->osc_state = nullptr;
        state->gain_state = createGainNode(graph->sample_rate, graph->channels);
        state->buffer_source_state = nullptr;
        node.state = state;
    } else if (type == "bufferSource" || type == "buffer_source") {
        node.type = 3;
        NodeState* state = new NodeState();
        state->frequency = 440.0f;
        state->detune = 0.0f;
        state->gain = 1.0f;
        state->osc_state = nullptr;
        state->gain_state = nullptr;
        state->buffer_source_state = createBufferSourceNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else {
        return 0; // Unsupported
    }

    int node_id = graph->next_id++;
    graph->nodes[node_id] = node;
    return node_id;
}

EMSCRIPTEN_KEEPALIVE
void connectNodes(int graph_id, int source_id, int dest_id, int output_idx, int input_idx) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    graph->connections[dest_id].push_back(source_id);
}

EMSCRIPTEN_KEEPALIVE
void startNode(int graph_id, int node_id, double when) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (node.type == 1 && node.state && node.state->osc_state) { // oscillator
        startOscillator(node.state->osc_state);
    } else if (node.type == 3 && node.state && node.state->buffer_source_state) { // buffer_source
        startBufferSource(node.state->buffer_source_state);
    }
}

EMSCRIPTEN_KEEPALIVE
void stopNode(int graph_id, int node_id, double when) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (node.type == 1 && node.state && node.state->osc_state) { // oscillator
        stopOscillator(node.state->osc_state);
    } else if (node.type == 3 && node.state && node.state->buffer_source_state) { // buffer_source
        stopBufferSource(node.state->buffer_source_state);
    }
}

EMSCRIPTEN_KEEPALIVE
void setNodeParameter(int graph_id, int node_id, const char* param_name, float value) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (!node.state) return;

    std::string param(param_name);

    if (node.type == 1) { // oscillator
        if (param == "frequency") {
            node.state->frequency = value;
        } else if (param == "detune") {
            node.state->detune = value;
        }
    } else if (node.type == 2) { // gain
        if (param == "gain") {
            node.state->gain = value;
        }
    }
}

// Process a single node
void processNode(AudioGraph* graph, int node_id, float* output, int frame_count, std::map<int, std::vector<float>>& buffers) {
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) {
        memset(output, 0, frame_count * graph->channels * sizeof(float));
        return;
    }

    Node& node = node_it->second;

    // Check if already processed this frame
    if (buffers.find(node_id) != buffers.end()) {
        memcpy(output, buffers[node_id].data(), frame_count * graph->channels * sizeof(float));
        return;
    }

    // Process based on node type
    if (node.type == 0) { // destination
        // Mix all inputs
        memset(output, 0, frame_count * graph->channels * sizeof(float));

        auto conn_it = graph->connections.find(node_id);
        if (conn_it != graph->connections.end()) {
            std::vector<float> temp_buffer(frame_count * graph->channels);

            for (int source_id : conn_it->second) {
                processNode(graph, source_id, temp_buffer.data(), frame_count, buffers);

                // Mix
                for (int i = 0; i < frame_count * graph->channels; i++) {
                    output[i] += temp_buffer[i];
                }
            }
        }

    } else if (node.type == 1) { // oscillator
        if (!node.state || !node.state->osc_state) {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        } else {
            // Call external SIMD-optimized oscillator
            processOscillatorNode(
                node.state->osc_state,
                output,
                frame_count,
                node.state->frequency,
                node.state->detune
            );
        }

    } else if (node.type == 2) { // gain
        if (!node.state || !node.state->gain_state) {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        } else {
            // Process input first
            auto conn_it = graph->connections.find(node_id);
            bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());

            if (has_input) {
                int source_id = conn_it->second[0];
                processNode(graph, source_id, output, frame_count, buffers);
            }

            // Call external SIMD-optimized gain
            processGainNode(
                node.state->gain_state,
                output,  // input
                output,  // output (in-place)
                frame_count,
                node.state->gain,
                has_input
            );
        }

    } else if (node.type == 3) { // buffer_source
        if (!node.state || !node.state->buffer_source_state) {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        } else {
            // Call external SIMD-optimized buffer source
            processBufferSourceNode(
                node.state->buffer_source_state,
                output,
                frame_count
            );
        }
    }

    // Cache result
    buffers[node_id] = std::vector<float>(output, output + frame_count * graph->channels);
}

EMSCRIPTEN_KEEPALIVE
void processGraph(int graph_id, float* output, int frame_count) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) {
        return;
    }

    AudioGraph* graph = it->second;
    std::map<int, std::vector<float>> buffers;

    // Process destination node (pulls entire graph)
    processNode(graph, graph->dest_id, output, frame_count, buffers);
}

EMSCRIPTEN_KEEPALIVE
double getCurrentTime(int graph_id) {
    return 0.0; // Offline rendering
}

EMSCRIPTEN_KEEPALIVE
void setNodeBuffer(int graph_id, int node_id, float* buffer_data, int buffer_frames, int buffer_channels) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (node.type == 3 && node.state && node.state->buffer_source_state) { // buffer_source
        setBufferSourceBuffer(node.state->buffer_source_state, buffer_data, buffer_frames, buffer_channels);
    }
}

EMSCRIPTEN_KEEPALIVE
void registerBuffer(int graph_id, int buffer_id, float* buffer_data, int buffer_frames, int buffer_channels) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;

    // Store buffer data in registry
    BufferData bd;
    bd.data = buffer_data;  // Pointer to WASM heap, not copied
    bd.frames = buffer_frames;
    bd.channels = buffer_channels;

    graph->buffers[buffer_id] = bd;
}

EMSCRIPTEN_KEEPALIVE
void setNodeBufferId(int graph_id, int node_id, int buffer_id) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;

    // Find the buffer
    auto buf_it = graph->buffers.find(buffer_id);
    if (buf_it == graph->buffers.end()) return;

    BufferData& bd = buf_it->second;

    // Find the node
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (node.type == 3 && node.state && node.state->buffer_source_state) {
        // Set buffer on buffer source node
        setBufferSourceBuffer(node.state->buffer_source_state, bd.data, bd.frames, bd.channels);
    }
}

// Stubs for compatibility
EMSCRIPTEN_KEEPALIVE void connectToParam(int, int, int, const char*, int) {}
EMSCRIPTEN_KEEPALIVE void disconnectNodes(int, int, int) {}
EMSCRIPTEN_KEEPALIVE void setWaveShaperCurve(int, int, float*, int) {}
EMSCRIPTEN_KEEPALIVE void setNodePeriodicWave(int, int, float*, int) {}
EMSCRIPTEN_KEEPALIVE void setNodeProperty(int, int, const char*, float) {}
EMSCRIPTEN_KEEPALIVE void setNodeStringProperty(int, int, const char*, const char*) {}
EMSCRIPTEN_KEEPALIVE void scheduleParameterValue(int, int, const char*, float, double) {}
EMSCRIPTEN_KEEPALIVE void scheduleParameterRamp(int, int, const char*, float, double, bool) {}

} // extern "C"
