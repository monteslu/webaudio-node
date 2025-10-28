// ChannelMergerNode - Merges multiple mono inputs into multi-channel output
// Each input becomes a channel in the output

#include <emscripten.h>
#include <cstring>

struct ChannelMergerNodeState {
    int sample_rate;
    int number_of_inputs;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
ChannelMergerNodeState* createChannelMergerNode(int sample_rate, int number_of_inputs) {
    ChannelMergerNodeState* state = new ChannelMergerNodeState();
    state->sample_rate = sample_rate;
    state->number_of_inputs = number_of_inputs;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyChannelMergerNode(ChannelMergerNodeState* state) {
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void processChannelMergerNode(
    ChannelMergerNodeState* state,
    float** inputs,
    int* input_frame_counts,
    bool* has_inputs,
    float* output,
    int frame_count
) {
    if (!state) {
        memset(output, 0, frame_count * state->number_of_inputs * sizeof(float));
        return;
    }

    // Merge separate mono inputs into interleaved multi-channel output
    // Input format: array of pointers to separate mono buffers
    // Output format: interleaved multi-channel

    for (int i = 0; i < frame_count; i++) {
        for (int ch = 0; ch < state->number_of_inputs; ch++) {
            if (has_inputs[ch] && inputs[ch] && input_frame_counts[ch] > i) {
                output[i * state->number_of_inputs + ch] = inputs[ch][i];
            } else {
                output[i * state->number_of_inputs + ch] = 0.0f;
            }
        }
    }
}

// Simplified version for when all inputs are already combined
EMSCRIPTEN_KEEPALIVE
void processChannelMergerNodeSimple(
    ChannelMergerNodeState* state,
    float* input,
    float* output,
    int frame_count,
    int input_channels,
    bool has_input
) {
    if (!state || !has_input) {
        memset(output, 0, frame_count * state->number_of_inputs * sizeof(float));
        return;
    }

    // Simple case: input is already multi-channel, just copy or pad
    for (int i = 0; i < frame_count; i++) {
        for (int ch = 0; ch < state->number_of_inputs; ch++) {
            if (ch < input_channels) {
                output[i * state->number_of_inputs + ch] = input[i * input_channels + ch];
            } else {
                output[i * state->number_of_inputs + ch] = 0.0f;
            }
        }
    }
}

} // extern "C"
