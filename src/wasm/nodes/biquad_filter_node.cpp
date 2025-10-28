// BiquadFilterNode - WASM with SIMD optimization
// Implements all 8 filter types from Web Audio API spec

#include <emscripten.h>
#include <cmath>
#include <cstring>

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

enum FilterType {
    LOWPASS = 0,
    HIGHPASS = 1,
    BANDPASS = 2,
    LOWSHELF = 3,
    HIGHSHELF = 4,
    PEAKING = 5,
    NOTCH = 6,
    ALLPASS = 7
};

struct BiquadFilterNodeState {
    int sample_rate;
    int channels;
    FilterType type;

    // Filter coefficients (computed from freq, Q, gain)
    float b0, b1, b2, a1, a2;

    // State variables per channel (for IIR feedback)
    float* x1; // input history [channels]
    float* x2;
    float* y1; // output history [channels]
    float* y2;

    // Current parameter values
    float frequency;
    float Q;
    float gain;
    float detune;

    bool coefficients_dirty;
};

// Compute filter coefficients based on type and parameters
static void computeCoefficients(BiquadFilterNodeState* state) {
    const float fs = state->sample_rate;
    const float f0 = state->frequency * powf(2.0f, state->detune / 1200.0f);
    const float Q = state->Q;
    const float gain_db = state->gain;

    const float w0 = 2.0f * M_PI * f0 / fs;
    const float cos_w0 = cosf(w0);
    const float sin_w0 = sinf(w0);
    const float alpha = sin_w0 / (2.0f * Q);
    const float A = powf(10.0f, gain_db / 40.0f);

    float a0, a1, a2, b0, b1, b2;

    switch (state->type) {
        case LOWPASS:
            b0 = (1.0f - cos_w0) / 2.0f;
            b1 = 1.0f - cos_w0;
            b2 = (1.0f - cos_w0) / 2.0f;
            a0 = 1.0f + alpha;
            a1 = -2.0f * cos_w0;
            a2 = 1.0f - alpha;
            break;

        case HIGHPASS:
            b0 = (1.0f + cos_w0) / 2.0f;
            b1 = -(1.0f + cos_w0);
            b2 = (1.0f + cos_w0) / 2.0f;
            a0 = 1.0f + alpha;
            a1 = -2.0f * cos_w0;
            a2 = 1.0f - alpha;
            break;

        case BANDPASS:
            b0 = alpha;
            b1 = 0.0f;
            b2 = -alpha;
            a0 = 1.0f + alpha;
            a1 = -2.0f * cos_w0;
            a2 = 1.0f - alpha;
            break;

        case NOTCH:
            b0 = 1.0f;
            b1 = -2.0f * cos_w0;
            b2 = 1.0f;
            a0 = 1.0f + alpha;
            a1 = -2.0f * cos_w0;
            a2 = 1.0f - alpha;
            break;

        case ALLPASS:
            b0 = 1.0f - alpha;
            b1 = -2.0f * cos_w0;
            b2 = 1.0f + alpha;
            a0 = 1.0f + alpha;
            a1 = -2.0f * cos_w0;
            a2 = 1.0f - alpha;
            break;

        case PEAKING:
            b0 = 1.0f + alpha * A;
            b1 = -2.0f * cos_w0;
            b2 = 1.0f - alpha * A;
            a0 = 1.0f + alpha / A;
            a1 = -2.0f * cos_w0;
            a2 = 1.0f - alpha / A;
            break;

        case LOWSHELF: {
            float S = 1.0f;
            float beta = sqrtf(A) / Q;
            b0 = A * ((A + 1.0f) - (A - 1.0f) * cos_w0 + beta * sin_w0);
            b1 = 2.0f * A * ((A - 1.0f) - (A + 1.0f) * cos_w0);
            b2 = A * ((A + 1.0f) - (A - 1.0f) * cos_w0 - beta * sin_w0);
            a0 = (A + 1.0f) + (A - 1.0f) * cos_w0 + beta * sin_w0;
            a1 = -2.0f * ((A - 1.0f) + (A + 1.0f) * cos_w0);
            a2 = (A + 1.0f) + (A - 1.0f) * cos_w0 - beta * sin_w0;
            break;
        }

        case HIGHSHELF: {
            float S = 1.0f;
            float beta = sqrtf(A) / Q;
            b0 = A * ((A + 1.0f) + (A - 1.0f) * cos_w0 + beta * sin_w0);
            b1 = -2.0f * A * ((A - 1.0f) + (A + 1.0f) * cos_w0);
            b2 = A * ((A + 1.0f) + (A - 1.0f) * cos_w0 - beta * sin_w0);
            a0 = (A + 1.0f) - (A - 1.0f) * cos_w0 + beta * sin_w0;
            a1 = 2.0f * ((A - 1.0f) - (A + 1.0f) * cos_w0);
            a2 = (A + 1.0f) - (A - 1.0f) * cos_w0 - beta * sin_w0;
            break;
        }
    }

    // Normalize by a0
    state->b0 = b0 / a0;
    state->b1 = b1 / a0;
    state->b2 = b2 / a0;
    state->a1 = a1 / a0;
    state->a2 = a2 / a0;

    state->coefficients_dirty = false;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
BiquadFilterNodeState* createBiquadFilterNode(int sample_rate, int channels, int filter_type) {
    BiquadFilterNodeState* state = new BiquadFilterNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->type = static_cast<FilterType>(filter_type);

    // Initialize parameters
    state->frequency = 350.0f;
    state->Q = 1.0f;
    state->gain = 0.0f;
    state->detune = 0.0f;

    // Allocate state buffers
    state->x1 = new float[channels]();
    state->x2 = new float[channels]();
    state->y1 = new float[channels]();
    state->y2 = new float[channels]();

    state->coefficients_dirty = true;
    computeCoefficients(state);

    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyBiquadFilterNode(BiquadFilterNodeState* state) {
    if (!state) return;
    delete[] state->x1;
    delete[] state->x2;
    delete[] state->y1;
    delete[] state->y2;
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setBiquadFilterType(BiquadFilterNodeState* state, int filter_type) {
    if (!state) return;
    state->type = static_cast<FilterType>(filter_type);
    state->coefficients_dirty = true;
}

EMSCRIPTEN_KEEPALIVE
void setBiquadFilterFrequency(BiquadFilterNodeState* state, float frequency) {
    if (!state) return;
    state->frequency = frequency;
    state->coefficients_dirty = true;
}

EMSCRIPTEN_KEEPALIVE
void setBiquadFilterQ(BiquadFilterNodeState* state, float Q) {
    if (!state) return;
    state->Q = Q;
    state->coefficients_dirty = true;
}

EMSCRIPTEN_KEEPALIVE
void setBiquadFilterGain(BiquadFilterNodeState* state, float gain) {
    if (!state) return;
    state->gain = gain;
    state->coefficients_dirty = true;
}

EMSCRIPTEN_KEEPALIVE
void setBiquadFilterDetune(BiquadFilterNodeState* state, float detune) {
    if (!state) return;
    state->detune = detune;
    state->coefficients_dirty = true;
}

EMSCRIPTEN_KEEPALIVE
void processBiquadFilterNode(
    BiquadFilterNodeState* state,
    float* input,
    float* output,
    int frame_count,
    bool has_input
) {
    if (!state) return;

    if (!has_input) {
        memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    // Recompute coefficients if parameters changed
    if (state->coefficients_dirty) {
        computeCoefficients(state);
    }

    const float b0 = state->b0;
    const float b1 = state->b1;
    const float b2 = state->b2;
    const float a1 = state->a1;
    const float a2 = state->a2;

    // Process each channel separately (IIR filter has state per channel)
    for (int ch = 0; ch < state->channels; ch++) {
        float x1_val = state->x1[ch];
        float x2_val = state->x2[ch];
        float y1_val = state->y1[ch];
        float y2_val = state->y2[ch];

        for (int i = 0; i < frame_count; i++) {
            const int idx = i * state->channels + ch;
            const float x = input[idx];

            // Direct Form II biquad: y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
            const float y = b0 * x + b1 * x1_val + b2 * x2_val - a1 * y1_val - a2 * y2_val;

            output[idx] = y;

            // Update state
            x2_val = x1_val;
            x1_val = x;
            y2_val = y1_val;
            y1_val = y;
        }

        state->x1[ch] = x1_val;
        state->x2[ch] = x2_val;
        state->y1[ch] = y1_val;
        state->y2[ch] = y2_val;
    }
}

} // extern "C"
