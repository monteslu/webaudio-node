// ConstantSourceNode - Outputs a constant value (for modulation)

#include <emscripten.h>
#include <cstring>

struct ConstantSourceNodeState {
    int sample_rate;
    int channels;
    float offset;
    bool is_playing;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
ConstantSourceNodeState* createConstantSourceNode(int sample_rate, int channels) {
    ConstantSourceNodeState* state = new ConstantSourceNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->offset = 1.0f;
    state->is_playing = false;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyConstantSourceNode(ConstantSourceNodeState* state) {
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void startConstantSource(ConstantSourceNodeState* state) {
    if (state) state->is_playing = true;
}

EMSCRIPTEN_KEEPALIVE
void stopConstantSource(ConstantSourceNodeState* state) {
    if (state) state->is_playing = false;
}

EMSCRIPTEN_KEEPALIVE
void setConstantSourceOffset(ConstantSourceNodeState* state, float offset) {
    if (state) state->offset = offset;
}

EMSCRIPTEN_KEEPALIVE
void processConstantSourceNode(
    ConstantSourceNodeState* state,
    float* output,
    int frame_count
) {
    if (!state || !state->is_playing) {
        memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    const float value = state->offset;
    const int total_samples = frame_count * state->channels;
    for (int i = 0; i < total_samples; i++) {
        output[i] = value;
    }
}

} // extern "C"
