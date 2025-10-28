// ChannelSplitterNode - Splits multi-channel audio into separate mono outputs
// Each output represents a single channel from the input

#include <emscripten.h>
#include <cstring>

struct ChannelSplitterNodeState {
    int sample_rate;
    int number_of_outputs;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
ChannelSplitterNodeState* createChannelSplitterNode(int sample_rate, int number_of_outputs) {
    ChannelSplitterNodeState* state = new ChannelSplitterNodeState();
    state->sample_rate = sample_rate;
    state->number_of_outputs = number_of_outputs;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyChannelSplitterNode(ChannelSplitterNodeState* state) {
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void processChannelSplitterNode(
    ChannelSplitterNodeState* state,
    float* input,
    float* output,
    int frame_count,
    int input_channels,
    bool has_input
) {
    if (!state || !has_input) {
        memset(output, 0, frame_count * state->number_of_outputs * sizeof(float));
        return;
    }

    // Split interleaved input channels into separate mono outputs
    // Output format: all frames for channel 0, then all frames for channel 1, etc.

    for (int ch = 0; ch < state->number_of_outputs; ch++) {
        if (ch < input_channels) {
            // Extract this channel from interleaved input
            for (int i = 0; i < frame_count; i++) {
                output[ch * frame_count + i] = input[i * input_channels + ch];
            }
        } else {
            // Output silence if requesting more channels than input has
            memset(&output[ch * frame_count], 0, frame_count * sizeof(float));
        }
    }
}

} // extern "C"
