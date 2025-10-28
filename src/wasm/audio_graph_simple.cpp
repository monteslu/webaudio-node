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
struct BiquadFilterNodeState;
struct DelayNodeState;
struct WaveShaperNodeState;
struct StereoPannerNodeState;
struct ConstantSourceNodeState;
struct ConvolverNodeState;
struct DynamicsCompressorNodeState;
struct AnalyserNodeState;
struct PannerNodeState;
struct IIRFilterNodeState;
struct ChannelSplitterNodeState;
struct ChannelMergerNodeState;
struct MediaStreamSourceNodeState;

extern "C" {
    // Oscillator
    OscillatorNodeState* createOscillatorNode(int sample_rate, int channels, int wave_type);
    void destroyOscillatorNode(OscillatorNodeState* state);
    void startOscillator(OscillatorNodeState* state);
    void stopOscillator(OscillatorNodeState* state);
    void processOscillatorNode(OscillatorNodeState* state, float* output, int frame_count, float frequency, float detune);

    // Gain
    GainNodeState* createGainNode(int sample_rate, int channels);
    void destroyGainNode(GainNodeState* state);
    void processGainNode(GainNodeState* state, float* input, float* output, int frame_count, float gain, bool has_input);

    // BufferSource
    BufferSourceNodeState* createBufferSourceNode(int sample_rate, int channels);
    void destroyBufferSourceNode(BufferSourceNodeState* state);
    void setBufferSourceBuffer(BufferSourceNodeState* state, float* buffer_data, int buffer_frames, int buffer_channels);
    void startBufferSource(BufferSourceNodeState* state, double when);
    void stopBufferSource(BufferSourceNodeState* state, double when);
    void setBufferSourceLoop(BufferSourceNodeState* state, bool loop);
    void setBufferSourceCurrentTime(BufferSourceNodeState* state, double time);
    void processBufferSourceNode(BufferSourceNodeState* state, float* output, int frame_count);

    // BiquadFilter
    BiquadFilterNodeState* createBiquadFilterNode(int sample_rate, int channels, int filter_type);
    void destroyBiquadFilterNode(BiquadFilterNodeState* state);
    void setBiquadFilterType(BiquadFilterNodeState* state, int type);
    void setBiquadFilterFrequency(BiquadFilterNodeState* state, float frequency);
    void setBiquadFilterQ(BiquadFilterNodeState* state, float q);
    void setBiquadFilterGain(BiquadFilterNodeState* state, float gain);
    void processBiquadFilterNode(BiquadFilterNodeState* state, float* input, float* output, int frame_count, bool has_input);

    // Delay
    DelayNodeState* createDelayNode(int sample_rate, int channels, float max_delay_time);
    void destroyDelayNode(DelayNodeState* state);
    void setDelayTime(DelayNodeState* state, float delay_time);
    void processDelayNode(DelayNodeState* state, float* input, float* output, int frame_count, bool has_input);

    // WaveShaper
    WaveShaperNodeState* createWaveShaperNode(int sample_rate, int channels);
    void destroyWaveShaperNode(WaveShaperNodeState* state);
    void setWaveShaperCurve_node(WaveShaperNodeState* state, float* curve, int length);
    void setWaveShaperOversample_node(WaveShaperNodeState* state, int oversample);
    void processWaveShaperNode(WaveShaperNodeState* state, float* input, float* output, int frame_count, bool has_input);

    // StereoPanner
    StereoPannerNodeState* createStereoPannerNode(int sample_rate);
    void destroyStereoPannerNode(StereoPannerNodeState* state);
    void setStereoPannerPan(StereoPannerNodeState* state, float pan);
    void processStereoPannerNode(StereoPannerNodeState* state, float* input, float* output, int frame_count, int input_channels, bool has_input);

    // ConstantSource
    ConstantSourceNodeState* createConstantSourceNode(int sample_rate, int channels);
    void destroyConstantSourceNode(ConstantSourceNodeState* state);
    void startConstantSource(ConstantSourceNodeState* state);
    void stopConstantSource(ConstantSourceNodeState* state);
    void setConstantSourceOffset(ConstantSourceNodeState* state, float offset);
    void processConstantSourceNode(ConstantSourceNodeState* state, float* output, int frame_count);

    // Convolver
    ConvolverNodeState* createConvolverNode(int sample_rate, int channels);
    void destroyConvolverNode(ConvolverNodeState* state);
    void setConvolverBuffer(ConvolverNodeState* state, float* buffer_data, int length, int num_channels);
    void setConvolverNormalize(ConvolverNodeState* state, bool normalize);
    void processConvolverNode(ConvolverNodeState* state, float* input, float* output, int frame_count, bool has_input);

    // DynamicsCompressor
    DynamicsCompressorNodeState* createDynamicsCompressorNode(int sample_rate, int channels);
    void destroyDynamicsCompressorNode(DynamicsCompressorNodeState* state);
    void setCompressorThreshold(DynamicsCompressorNodeState* state, float threshold);
    void setCompressorKnee(DynamicsCompressorNodeState* state, float knee);
    void setCompressorRatio(DynamicsCompressorNodeState* state, float ratio);
    void setCompressorAttack(DynamicsCompressorNodeState* state, float attack);
    void setCompressorRelease(DynamicsCompressorNodeState* state, float release);
    void processDynamicsCompressorNode(DynamicsCompressorNodeState* state, float* input, float* output, int frame_count, bool has_input);

    // Analyser
    AnalyserNodeState* createAnalyserNode(int sample_rate, int channels);
    void destroyAnalyserNode(AnalyserNodeState* state);
    void setAnalyserFFTSize(AnalyserNodeState* state, int fft_size);
    void setAnalyserMinDecibels(AnalyserNodeState* state, float min_decibels);
    void setAnalyserMaxDecibels(AnalyserNodeState* state, float max_decibels);
    void setAnalyserSmoothingTimeConstant(AnalyserNodeState* state, float smoothing);
    void processAnalyserNode(AnalyserNodeState* state, float* input, float* output, int frame_count, bool has_input);
    void getAnalyserFloatFrequencyData(AnalyserNodeState* state, float* array, int array_size);
    void getAnalyserFloatTimeDomainData(AnalyserNodeState* state, float* array, int array_size);

    // Panner
    PannerNodeState* createPannerNode(int sample_rate, int channels);
    void destroyPannerNode(PannerNodeState* state);
    void setPannerPosition(PannerNodeState* state, float x, float y, float z);
    void setPannerOrientation(PannerNodeState* state, float x, float y, float z);
    void setListenerPosition(PannerNodeState* state, float x, float y, float z);
    void processPannerNode(PannerNodeState* state, float* input, float* output, int frame_count, bool has_input);

    // IIRFilter
    IIRFilterNodeState* createIIRFilterNode(int sample_rate, int channels, float* feedforward, int feedforward_length, float* feedback, int feedback_length);
    void destroyIIRFilterNode(IIRFilterNodeState* state);
    void processIIRFilterNode(IIRFilterNodeState* state, float* input, float* output, int frame_count, bool has_input);

    // ChannelSplitter
    ChannelSplitterNodeState* createChannelSplitterNode(int sample_rate, int number_of_outputs);
    void destroyChannelSplitterNode(ChannelSplitterNodeState* state);
    void processChannelSplitterNode(ChannelSplitterNodeState* state, float* input, float* output, int frame_count, int input_channels, bool has_input);

    // ChannelMerger
    ChannelMergerNodeState* createChannelMergerNode(int sample_rate, int number_of_inputs);
    void destroyChannelMergerNode(ChannelMergerNodeState* state);
    void processChannelMergerNodeSimple(ChannelMergerNodeState* state, float* input, float* output, int frame_count, int input_channels, bool has_input);

    // MediaStreamSource
    MediaStreamSourceNodeState* createMediaStreamSourceNode(int sample_rate, int channels, float buffer_duration_seconds);
    void destroyMediaStreamSourceNode(MediaStreamSourceNodeState* state);
    void startMediaStreamSource(MediaStreamSourceNodeState* state);
    void stopMediaStreamSource(MediaStreamSourceNodeState* state);
    void processMediaStreamSourceNode(MediaStreamSourceNodeState* state, float* output, int frame_count, int output_channels);
}

struct NodeState {
    float frequency;  // oscillator
    float detune;     // oscillator
    float gain;       // gain
    float filter_frequency;  // biquad
    float filter_q;          // biquad
    float filter_gain;       // biquad
    float delay_time;        // delay
    float pan;               // stereo panner
    float offset;            // constant source

    // Pointers to external node states
    OscillatorNodeState* osc_state;
    GainNodeState* gain_state;
    BufferSourceNodeState* buffer_source_state;
    BiquadFilterNodeState* biquad_state;
    DelayNodeState* delay_state;
    WaveShaperNodeState* waveshaper_state;
    StereoPannerNodeState* stereo_panner_state;
    ConstantSourceNodeState* constant_source_state;
    ConvolverNodeState* convolver_state;
    DynamicsCompressorNodeState* compressor_state;
    AnalyserNodeState* analyser_state;
    PannerNodeState* panner_state;
    IIRFilterNodeState* iir_filter_state;
    ChannelSplitterNodeState* channel_splitter_state;
    ChannelMergerNodeState* channel_merger_state;
    MediaStreamSourceNodeState* media_stream_source_state;
};

struct Node {
    // 0=destination, 1=oscillator, 2=gain, 3=buffer_source, 4=biquad_filter,
    // 5=delay, 6=wave_shaper, 7=stereo_panner, 8=constant_source, 9=convolver,
    // 10=dynamics_compressor, 11=analyser, 12=panner, 13=iir_filter,
    // 14=channel_splitter, 15=channel_merger, 16=media_stream_source
    int type;
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
    uint64_t current_sample; // Track current sample for timing
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
    graph->current_sample = 0;

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
                if (node.state->osc_state) destroyOscillatorNode(node.state->osc_state);
                if (node.state->gain_state) destroyGainNode(node.state->gain_state);
                if (node.state->buffer_source_state) destroyBufferSourceNode(node.state->buffer_source_state);
                if (node.state->biquad_state) destroyBiquadFilterNode(node.state->biquad_state);
                if (node.state->delay_state) destroyDelayNode(node.state->delay_state);
                if (node.state->waveshaper_state) destroyWaveShaperNode(node.state->waveshaper_state);
                if (node.state->stereo_panner_state) destroyStereoPannerNode(node.state->stereo_panner_state);
                if (node.state->constant_source_state) destroyConstantSourceNode(node.state->constant_source_state);
                if (node.state->convolver_state) destroyConvolverNode(node.state->convolver_state);
                if (node.state->compressor_state) destroyDynamicsCompressorNode(node.state->compressor_state);
                if (node.state->analyser_state) destroyAnalyserNode(node.state->analyser_state);
                if (node.state->panner_state) destroyPannerNode(node.state->panner_state);
                if (node.state->iir_filter_state) destroyIIRFilterNode(node.state->iir_filter_state);
                if (node.state->channel_splitter_state) destroyChannelSplitterNode(node.state->channel_splitter_state);
                if (node.state->channel_merger_state) destroyChannelMergerNode(node.state->channel_merger_state);
                delete node.state;
            }
        }

        // Free all registered buffers
        for (auto& pair : graph->buffers) {
            if (pair.second.data) {
                free(pair.second.data);
            }
        }

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

    // Helper to init node state
    auto init_state = [&]() {
        NodeState* state = new NodeState();
        state->frequency = 440.0f;
        state->detune = 0.0f;
        state->gain = 1.0f;
        state->filter_frequency = 350.0f;
        state->filter_q = 1.0f;
        state->filter_gain = 0.0f;
        state->delay_time = 0.0f;
        state->pan = 0.0f;
        state->offset = 1.0f;
        state->osc_state = nullptr;
        state->gain_state = nullptr;
        state->buffer_source_state = nullptr;
        state->biquad_state = nullptr;
        state->delay_state = nullptr;
        state->waveshaper_state = nullptr;
        state->stereo_panner_state = nullptr;
        state->constant_source_state = nullptr;
        state->convolver_state = nullptr;
        state->compressor_state = nullptr;
        state->analyser_state = nullptr;
        state->panner_state = nullptr;
        state->iir_filter_state = nullptr;
        state->channel_splitter_state = nullptr;
        state->channel_merger_state = nullptr;
        state->media_stream_source_state = nullptr;
        return state;
    };

    if (type == "oscillator") {
        node.type = 1;
        NodeState* state = init_state();
        state->osc_state = createOscillatorNode(graph->sample_rate, graph->channels, 2);
        node.state = state;
    } else if (type == "gain") {
        node.type = 2;
        NodeState* state = init_state();
        state->gain_state = createGainNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "bufferSource" || type == "buffer_source") {
        node.type = 3;
        NodeState* state = init_state();
        state->buffer_source_state = createBufferSourceNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "biquadFilter" || type == "biquad_filter") {
        node.type = 4;
        NodeState* state = init_state();
        state->biquad_state = createBiquadFilterNode(graph->sample_rate, graph->channels, 0); // 0 = LOWPASS
        node.state = state;
    } else if (type == "delay") {
        node.type = 5;
        NodeState* state = init_state();
        state->delay_state = createDelayNode(graph->sample_rate, graph->channels, 1.0f);
        node.state = state;
    } else if (type == "waveShaper" || type == "wave_shaper") {
        node.type = 6;
        NodeState* state = init_state();
        state->waveshaper_state = createWaveShaperNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "stereoPanner" || type == "stereo_panner") {
        node.type = 7;
        NodeState* state = init_state();
        state->stereo_panner_state = createStereoPannerNode(graph->sample_rate);
        node.state = state;
    } else if (type == "constantSource" || type == "constant_source") {
        node.type = 8;
        NodeState* state = init_state();
        state->constant_source_state = createConstantSourceNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "convolver") {
        node.type = 9;
        NodeState* state = init_state();
        state->convolver_state = createConvolverNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "dynamicsCompressor" || type == "dynamics_compressor") {
        node.type = 10;
        NodeState* state = init_state();
        state->compressor_state = createDynamicsCompressorNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "analyser") {
        node.type = 11;
        NodeState* state = init_state();
        state->analyser_state = createAnalyserNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "panner") {
        node.type = 12;
        NodeState* state = init_state();
        state->panner_state = createPannerNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "IIRFilter" || type == "iirFilter" || type == "iir_filter") {
        node.type = 13;
        // IIR filter requires coefficients - will be set later via setNodeProperty
        // Default: simple pass-through (b=[1], a=[1])
        NodeState* state = init_state();
        float b[] = {1.0f};
        float a[] = {1.0f};
        state->iir_filter_state = createIIRFilterNode(graph->sample_rate, graph->channels, b, 1, a, 1);
        node.state = state;
    } else if (type == "channelSplitter" || type == "channel_splitter") {
        node.type = 14;
        NodeState* state = init_state();
        state->channel_splitter_state = createChannelSplitterNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "channelMerger" || type == "channel_merger") {
        node.type = 15;
        NodeState* state = init_state();
        state->channel_merger_state = createChannelMergerNode(graph->sample_rate, graph->channels);
        node.state = state;
    } else if (type == "mediaStreamSource" || type == "media-stream-source" || type == "media_stream_source") {
        node.type = 16;
        NodeState* state = init_state();
        // Don't create MediaStreamSourceNodeState here - it will be set via setMediaStreamSourceState()
        state->media_stream_source_state = nullptr;
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
        startBufferSource(node.state->buffer_source_state, when);
    } else if (node.type == 8 && node.state && node.state->constant_source_state) { // constant_source
        startConstantSource(node.state->constant_source_state);
    } else if (node.type == 16 && node.state && node.state->media_stream_source_state) { // media_stream_source
        startMediaStreamSource(node.state->media_stream_source_state);
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
        stopBufferSource(node.state->buffer_source_state, when);
    } else if (node.type == 8 && node.state && node.state->constant_source_state) { // constant_source
        stopConstantSource(node.state->constant_source_state);
    } else if (node.type == 16 && node.state && node.state->media_stream_source_state) { // media_stream_source
        stopMediaStreamSource(node.state->media_stream_source_state);
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
        if (param == "frequency") node.state->frequency = value;
        else if (param == "detune") node.state->detune = value;
    } else if (node.type == 2) { // gain
        if (param == "gain") node.state->gain = value;
    } else if (node.type == 4 && node.state->biquad_state) { // biquad_filter
        if (param == "frequency") {
            node.state->filter_frequency = value;
            setBiquadFilterFrequency(node.state->biquad_state, value);
        } else if (param == "Q") {
            node.state->filter_q = value;
            setBiquadFilterQ(node.state->biquad_state, value);
        } else if (param == "gain") {
            node.state->filter_gain = value;
            setBiquadFilterGain(node.state->biquad_state, value);
        }
    } else if (node.type == 5 && node.state->delay_state) { // delay
        if (param == "delayTime") {
            node.state->delay_time = value;
            setDelayTime(node.state->delay_state, value);
        }
    } else if (node.type == 7 && node.state->stereo_panner_state) { // stereo_panner
        if (param == "pan") {
            node.state->pan = value;
            setStereoPannerPan(node.state->stereo_panner_state, value);
        }
    } else if (node.type == 8 && node.state->constant_source_state) { // constant_source
        if (param == "offset") {
            node.state->offset = value;
            setConstantSourceOffset(node.state->constant_source_state, value);
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
            // Update current time for scheduled start/stop
            double current_time = static_cast<double>(graph->current_sample) / static_cast<double>(graph->sample_rate);
            setBufferSourceCurrentTime(node.state->buffer_source_state, current_time);
            processBufferSourceNode(node.state->buffer_source_state, output, frame_count);
        }

    } else if (node.type == 4) { // biquad_filter
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->biquad_state) {
            processBiquadFilterNode(node.state->biquad_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 5) { // delay
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->delay_state) {
            processDelayNode(node.state->delay_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 6) { // wave_shaper
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->waveshaper_state) {
            processWaveShaperNode(node.state->waveshaper_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 7) { // stereo_panner
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->stereo_panner_state) {
            processStereoPannerNode(node.state->stereo_panner_state, output, output, frame_count, graph->channels, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 8) { // constant_source
        if (!node.state || !node.state->constant_source_state) {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        } else {
            processConstantSourceNode(node.state->constant_source_state, output, frame_count);
        }

    } else if (node.type == 9) { // convolver
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->convolver_state) {
            processConvolverNode(node.state->convolver_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 10) { // dynamics_compressor
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->compressor_state) {
            processDynamicsCompressorNode(node.state->compressor_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 11) { // analyser
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->analyser_state) {
            processAnalyserNode(node.state->analyser_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 12) { // panner
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->panner_state) {
            processPannerNode(node.state->panner_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 13) { // iir_filter
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->iir_filter_state) {
            processIIRFilterNode(node.state->iir_filter_state, output, output, frame_count, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 14) { // channel_splitter
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->channel_splitter_state) {
            processChannelSplitterNode(node.state->channel_splitter_state, output, output, frame_count, graph->channels, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 15) { // channel_merger
        auto conn_it = graph->connections.find(node_id);
        bool has_input = (conn_it != graph->connections.end() && !conn_it->second.empty());
        if (has_input) {
            int source_id = conn_it->second[0];
            processNode(graph, source_id, output, frame_count, buffers);
        }
        if (node.state && node.state->channel_merger_state) {
            processChannelMergerNodeSimple(node.state->channel_merger_state, output, output, frame_count, graph->channels, has_input);
        } else {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        }

    } else if (node.type == 16) { // media_stream_source
        if (!node.state || !node.state->media_stream_source_state) {
            memset(output, 0, frame_count * graph->channels * sizeof(float));
        } else {
            // Pull audio from microphone ring buffer
            // Pass graph->channels so it can up-mix mono to stereo if needed
            processMediaStreamSourceNode(node.state->media_stream_source_state, output, frame_count, graph->channels);
        }

    } else {
        // Unknown node type
        memset(output, 0, frame_count * graph->channels * sizeof(float));
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

    // Increment sample counter for timing
    graph->current_sample += frame_count;
}

EMSCRIPTEN_KEEPALIVE
double getCurrentTime(int graph_id) {
    return 0.0; // Offline rendering
}

EMSCRIPTEN_KEEPALIVE
void setGraphCurrentTime(int graph_id, double time) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    // Convert time to samples for internal tracking
    graph->current_sample = static_cast<uint64_t>(time * graph->sample_rate);
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
    } else if (node.type == 9 && node.state && node.state->convolver_state) { // convolver
        setConvolverBuffer(node.state->convolver_state, buffer_data, buffer_frames, buffer_channels);
    }
}

EMSCRIPTEN_KEEPALIVE
void setIIRFilterCoefficients(int graph_id, int node_id, float* feedforward, int feedforward_length, float* feedback, int feedback_length) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (node.type == 13 && node.state) { // iir_filter
        // Destroy old IIR filter state
        if (node.state->iir_filter_state) {
            destroyIIRFilterNode(node.state->iir_filter_state);
        }
        // Create new IIR filter with updated coefficients
        node.state->iir_filter_state = createIIRFilterNode(
            graph->sample_rate,
            graph->channels,
            feedforward,
            feedforward_length,
            feedback,
            feedback_length
        );
    }
}

EMSCRIPTEN_KEEPALIVE
void setMediaStreamSourceState(int graph_id, int node_id, MediaStreamSourceNodeState* wasm_state) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (node.type == 16 && node.state) { // media_stream_source
        node.state->media_stream_source_state = wasm_state;
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

EMSCRIPTEN_KEEPALIVE
void setWaveShaperCurve(int graph_id, int node_id, float* curve_data, int curve_length) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    Node& node = node_it->second;
    if (node.type == 6 && node.state && node.state->waveshaper_state) { // waveshaper
        setWaveShaperCurve_node(node.state->waveshaper_state, curve_data, curve_length);
    }
}

EMSCRIPTEN_KEEPALIVE
void setWaveShaperOversample(int graph_id, int node_id, const char* oversample_str) {
    auto it = graphs.find(graph_id);
    if (it == graphs.end()) return;

    AudioGraph* graph = it->second;
    auto node_it = graph->nodes.find(node_id);
    if (node_it == graph->nodes.end()) return;

    // Convert string to oversample enum
    int oversample_value = 0; // 0 = none
    if (oversample_str) {
        std::string os(oversample_str);
        if (os == "2x") oversample_value = 1;
        else if (os == "4x") oversample_value = 2;
    }

    Node& node = node_it->second;
    if (node.type == 6 && node.state && node.state->waveshaper_state) { // waveshaper
        setWaveShaperOversample_node(node.state->waveshaper_state, oversample_value);
    }
}

// Stubs for compatibility
EMSCRIPTEN_KEEPALIVE void connectToParam(int, int, int, const char*, int) {}
EMSCRIPTEN_KEEPALIVE void disconnectNodes(int, int, int) {}
EMSCRIPTEN_KEEPALIVE void setNodePeriodicWave(int, int, float*, int) {}
EMSCRIPTEN_KEEPALIVE void setNodeProperty(int, int, const char*, float) {}
EMSCRIPTEN_KEEPALIVE void setNodeStringProperty(int, int, const char*, const char*) {}
EMSCRIPTEN_KEEPALIVE void scheduleParameterValue(int, int, const char*, float, double) {}
EMSCRIPTEN_KEEPALIVE void scheduleParameterRamp(int, int, const char*, float, double, bool) {}

} // extern "C"
