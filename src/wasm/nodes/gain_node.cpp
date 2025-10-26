// GainNode WASM implementation
// Applies gain (volume) to input audio

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cstring>

// GainNode state
struct GainNodeState {
    int sample_rate;
    int channels;
    bool is_active;

    // Input buffer for mixing multiple inputs
    float* input_buffer;
    int input_buffer_size;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
GainNodeState* createGainNode(int sample_rate, int channels) {
    GainNodeState* state = new GainNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->is_active = true;
    state->input_buffer = nullptr;
    state->input_buffer_size = 0;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyGainNode(GainNodeState* state) {
    if (!state) return;

    if (state->input_buffer) {
        delete[] state->input_buffer;
    }

    delete state;
}

// Clear buffer (set to zero)
static inline void ClearBuffer(float* buffer, int frame_count, int channels) {
    int sample_count = frame_count * channels;
    memset(buffer, 0, sample_count * sizeof(float));
}

// Apply gain with SIMD optimization
static void ApplyGain(float* buffer, int sample_count, float gain) {
    // Fast path: gain = 1.0 means no-op
    if (gain == 1.0f) {
        return;
    }

    int i = 0;

#ifdef __wasm_simd128__
    // WASM SIMD: Process 4 samples at once
    v128_t gain_vec = wasm_f32x4_splat(gain);

    for (; i + 4 <= sample_count; i += 4) {
        v128_t data = wasm_v128_load(&buffer[i]);
        data = wasm_f32x4_mul(data, gain_vec);
        wasm_v128_store(&buffer[i], data);
    }
#endif

    // Scalar tail
    for (; i < sample_count; ++i) {
        buffer[i] *= gain;
    }
}

EMSCRIPTEN_KEEPALIVE
void processGainNode(
    GainNodeState* state,
    float* input,
    float* output,
    int frame_count,
    float gain,
    bool has_input
) {
    if (!state) return;

    const int sample_count = frame_count * state->channels;

    // If no input, output silence
    if (!has_input) {
        ClearBuffer(output, frame_count, state->channels);
        return;
    }

    // Copy input to output
    if (input != output) {
        memcpy(output, input, sample_count * sizeof(float));
    }

    // Apply gain
    ApplyGain(output, sample_count, gain);
}

} // extern "C"
