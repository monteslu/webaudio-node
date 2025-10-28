// StereoPannerNode - Simple equal-power stereo panning

#include <emscripten.h>
#include <cstring>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

struct StereoPannerNodeState {
    int sample_rate;
    float pan; // -1 (left) to +1 (right)
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
StereoPannerNodeState* createStereoPannerNode(int sample_rate) {
    StereoPannerNodeState* state = new StereoPannerNodeState();
    state->sample_rate = sample_rate;
    state->pan = 0.0f;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyStereoPannerNode(StereoPannerNodeState* state) {
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setStereoPannerPan(StereoPannerNodeState* state, float pan) {
    if (!state) return;
    state->pan = fmaxf(-1.0f, fminf(1.0f, pan));
}

EMSCRIPTEN_KEEPALIVE
void processStereoPannerNode(
    StereoPannerNodeState* state,
    float* input,
    float* output,
    int frame_count,
    int input_channels,
    bool has_input
) {
    if (!state || !has_input) {
        memset(output, 0, frame_count * 2 * sizeof(float));
        return;
    }

    // Equal-power panning
    const float pan = state->pan;
    const float x = (pan + 1.0f) * 0.5f; // Map [-1,1] to [0,1]
    const float angle = x * M_PI * 0.5f;
    const float gain_l = cosf(angle);
    const float gain_r = sinf(angle);

    if (input_channels == 1) {
        // Mono to stereo
        for (int i = 0; i < frame_count; i++) {
            const float sample = input[i];
            output[i * 2] = sample * gain_l;
            output[i * 2 + 1] = sample * gain_r;
        }
    } else {
        // Stereo to stereo
        for (int i = 0; i < frame_count; i++) {
            const float left = input[i * 2];
            const float right = input[i * 2 + 1];
            output[i * 2] = left * gain_l;
            output[i * 2 + 1] = right * gain_r;
        }
    }
}

} // extern "C"
