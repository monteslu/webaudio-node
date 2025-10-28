// WaveShaperNode - Fast lookup-based distortion with SIMD
// Uses linear interpolation for smooth curve mapping

#include <emscripten.h>
#include <cstring>
#include <cmath>

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

struct WaveShaperNodeState {
    int sample_rate;
    int channels;
    float* curve;
    int curve_length;
    int oversample; // 0=none, 1=2x, 2=4x
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
WaveShaperNodeState* createWaveShaperNode(int sample_rate, int channels) {
    WaveShaperNodeState* state = new WaveShaperNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->curve = nullptr;
    state->curve_length = 0;
    state->oversample = 0;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyWaveShaperNode(WaveShaperNodeState* state) {
    if (!state) return;
    delete[] state->curve;
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setWaveShaperCurve_node(WaveShaperNodeState* state, float* curve, int length) {
    if (!state) return;

    delete[] state->curve;

    if (curve && length > 0) {
        state->curve = new float[length];
        memcpy(state->curve, curve, length * sizeof(float));
        state->curve_length = length;
    } else {
        state->curve = nullptr;
        state->curve_length = 0;
    }
}

EMSCRIPTEN_KEEPALIVE
void setWaveShaperOversample_node(WaveShaperNodeState* state, int oversample) {
    if (!state) return;
    state->oversample = oversample;
}

// Map input sample [-1, 1] to curve using linear interpolation
static inline float applyCurve(float input, const float* curve, int curve_length) {
    if (!curve || curve_length == 0) {
        return input; // Pass through if no curve
    }

    // Clamp input to [-1, 1]
    input = fmaxf(-1.0f, fminf(1.0f, input));

    // Map [-1, 1] to [0, curve_length-1]
    const float position = (input + 1.0f) * 0.5f * (curve_length - 1);
    const int index1 = static_cast<int>(floorf(position));
    const int index2 = fminf(index1 + 1, curve_length - 1);
    const float frac = position - index1;

    // Linear interpolation
    return curve[index1] + frac * (curve[index2] - curve[index1]);
}

EMSCRIPTEN_KEEPALIVE
void processWaveShaperNode(
    WaveShaperNodeState* state,
    float* input,
    float* output,
    int frame_count,
    bool has_input
) {
    if (!state) return;

    if (!has_input || !state->curve) {
        // Pass through or silence
        if (has_input) {
            memcpy(output, input, frame_count * state->channels * sizeof(float));
        } else {
            memset(output, 0, frame_count * state->channels * sizeof(float));
        }
        return;
    }

    const int total_samples = frame_count * state->channels;

#ifdef __wasm_simd128__
    // SIMD processing (4 samples at a time)
    int i = 0;
    for (; i + 3 < total_samples; i += 4) {
        // Load 4 input samples
        v128_t in = wasm_v128_load(&input[i]);

        // Extract and process individually (curve lookup can't be vectorized easily)
        float samples[4];
        wasm_v128_store(samples, in);

        for (int j = 0; j < 4; j++) {
            samples[j] = applyCurve(samples[j], state->curve, state->curve_length);
        }

        // Store result
        wasm_v128_store(&output[i], wasm_v128_load(samples));
    }

    // Process remaining samples
    for (; i < total_samples; i++) {
        output[i] = applyCurve(input[i], state->curve, state->curve_length);
    }
#else
    // Scalar fallback
    for (int i = 0; i < total_samples; i++) {
        output[i] = applyCurve(input[i], state->curve, state->curve_length);
    }
#endif
}

} // extern "C"
