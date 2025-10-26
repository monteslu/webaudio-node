// WaveShaper WASM Proof of Concept
// Standalone module to validate WASM SIMD performance vs ARM NEON
// This is Phase 1 - validates the migration approach

#include <cmath>
#include <algorithm>
#include <emscripten.h>

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

// WaveShaper state structure
struct WaveShaperState {
    float* curve_data;
    int curve_length;
    int sample_rate;
    int channels;
};

// Export C functions for JavaScript FFI
extern "C" {

// Create WaveShaper instance
EMSCRIPTEN_KEEPALIVE
WaveShaperState* createWaveShaper(int sample_rate, int channels) {
    WaveShaperState* state = new WaveShaperState();
    state->curve_data = nullptr;
    state->curve_length = 0;
    state->sample_rate = sample_rate;
    state->channels = channels;
    return state;
}

// Set curve data
EMSCRIPTEN_KEEPALIVE
void setCurve(WaveShaperState* state, float* curve_data, int curve_length) {
    if (!state) return;

    // Free existing curve
    if (state->curve_data) {
        delete[] state->curve_data;
    }

    // Copy curve data
    state->curve_data = new float[curve_length];
    for (int i = 0; i < curve_length; ++i) {
        state->curve_data[i] = curve_data[i];
    }
    state->curve_length = curve_length;
}

// Clear curve
EMSCRIPTEN_KEEPALIVE
void clearCurve(WaveShaperState* state) {
    if (!state) return;

    if (state->curve_data) {
        delete[] state->curve_data;
        state->curve_data = nullptr;
    }
    state->curve_length = 0;
}

// Process audio - WASM SIMD optimized (equivalent to ARM NEON version)
EMSCRIPTEN_KEEPALIVE
void processWaveShaper(WaveShaperState* state, float* buffer, int frame_count) {
    if (!state || !buffer) return;

    const float* curve_data = state->curve_data;
    const int curve_size = state->curve_length;

    // No curve = pass through
    if (!curve_data || curve_size == 0) {
        return;
    }

    const int total_samples = frame_count * state->channels;
    const float curve_size_f = static_cast<float>(curve_size);
    const float scale = (curve_size_f - 1.0f) / 2.0f;
    const int curve_size_minus_1 = curve_size - 1;

#ifdef __wasm_simd128__
    // WASM SIMD path: Process 8 samples at a time (same as ARM NEON version)
    const int batch_size = 8;
    const int simd_samples = (total_samples / batch_size) * batch_size;

    const v128_t vmin = wasm_f32x4_splat(-1.0f);
    const v128_t vmax = wasm_f32x4_splat(1.0f);
    const v128_t vone = wasm_f32x4_splat(1.0f);
    const v128_t vscale = wasm_f32x4_splat(scale);

    for (int i = 0; i < simd_samples; i += batch_size) {
        // Load and process first 4 samples
        v128_t input_vec0 = wasm_v128_load(&buffer[i]);
        input_vec0 = wasm_f32x4_max(input_vec0, vmin);  // Clamp min
        input_vec0 = wasm_f32x4_min(input_vec0, vmax);  // Clamp max
        v128_t index_vec0 = wasm_f32x4_mul(wasm_f32x4_add(input_vec0, vone), vscale);

        // Load and process second 4 samples
        v128_t input_vec1 = wasm_v128_load(&buffer[i + 4]);
        input_vec1 = wasm_f32x4_max(input_vec1, vmin);
        input_vec1 = wasm_f32x4_min(input_vec1, vmax);
        v128_t index_vec1 = wasm_f32x4_mul(wasm_f32x4_add(input_vec1, vone), vscale);

        // Store indices for curve lookup
        float index_array[8];
        wasm_v128_store(index_array, index_vec0);
        wasm_v128_store(index_array + 4, index_vec1);

        // Unrolled scalar curve lookup - process all 8 samples
        // (Same approach as ARM NEON - curve lookup is random access, hard to vectorize)

        float index_float0 = index_array[0];
        int index_low0 = static_cast<int>(index_float0);
        int index_high0 = (index_low0 < curve_size_minus_1) ? (index_low0 + 1) : index_low0;
        float frac0 = index_float0 - index_low0;
        buffer[i] = curve_data[index_low0] * (1.0f - frac0) + curve_data[index_high0] * frac0;

        float index_float1 = index_array[1];
        int index_low1 = static_cast<int>(index_float1);
        int index_high1 = (index_low1 < curve_size_minus_1) ? (index_low1 + 1) : index_low1;
        float frac1 = index_float1 - index_low1;
        buffer[i + 1] = curve_data[index_low1] * (1.0f - frac1) + curve_data[index_high1] * frac1;

        float index_float2 = index_array[2];
        int index_low2 = static_cast<int>(index_float2);
        int index_high2 = (index_low2 < curve_size_minus_1) ? (index_low2 + 1) : index_low2;
        float frac2 = index_float2 - index_low2;
        buffer[i + 2] = curve_data[index_low2] * (1.0f - frac2) + curve_data[index_high2] * frac2;

        float index_float3 = index_array[3];
        int index_low3 = static_cast<int>(index_float3);
        int index_high3 = (index_low3 < curve_size_minus_1) ? (index_low3 + 1) : index_low3;
        float frac3 = index_float3 - index_low3;
        buffer[i + 3] = curve_data[index_low3] * (1.0f - frac3) + curve_data[index_high3] * frac3;

        float index_float4 = index_array[4];
        int index_low4 = static_cast<int>(index_float4);
        int index_high4 = (index_low4 < curve_size_minus_1) ? (index_low4 + 1) : index_low4;
        float frac4 = index_float4 - index_low4;
        buffer[i + 4] = curve_data[index_low4] * (1.0f - frac4) + curve_data[index_high4] * frac4;

        float index_float5 = index_array[5];
        int index_low5 = static_cast<int>(index_float5);
        int index_high5 = (index_low5 < curve_size_minus_1) ? (index_low5 + 1) : index_low5;
        float frac5 = index_float5 - index_low5;
        buffer[i + 5] = curve_data[index_low5] * (1.0f - frac5) + curve_data[index_high5] * frac5;

        float index_float6 = index_array[6];
        int index_low6 = static_cast<int>(index_float6);
        int index_high6 = (index_low6 < curve_size_minus_1) ? (index_low6 + 1) : index_low6;
        float frac6 = index_float6 - index_low6;
        buffer[i + 6] = curve_data[index_low6] * (1.0f - frac6) + curve_data[index_high6] * frac6;

        float index_float7 = index_array[7];
        int index_low7 = static_cast<int>(index_float7);
        int index_high7 = (index_low7 < curve_size_minus_1) ? (index_low7 + 1) : index_low7;
        float frac7 = index_float7 - index_low7;
        buffer[i + 7] = curve_data[index_low7] * (1.0f - frac7) + curve_data[index_high7] * frac7;
    }

    // Scalar cleanup for remaining samples
    for (int i = simd_samples; i < total_samples; ++i) {
#else
    // Scalar fallback path (if WASM SIMD not available)
    for (int i = 0; i < total_samples; ++i) {
#endif
        // Clamp input to [-1, 1]
        float input = buffer[i];
        input = (input < -1.0f) ? -1.0f : ((input > 1.0f) ? 1.0f : input);

        // Map input from [-1, 1] to curve index [0, curve_size - 1]
        float index_float = (input + 1.0f) * scale;

        // Linear interpolation between curve points
        int index_low = static_cast<int>(index_float);
        int index_high = (index_low < curve_size_minus_1) ? (index_low + 1) : index_low;
        float frac = index_float - index_low;

        buffer[i] = curve_data[index_low] * (1.0f - frac) + curve_data[index_high] * frac;
    }
}

// Destroy WaveShaper instance
EMSCRIPTEN_KEEPALIVE
void destroyWaveShaper(WaveShaperState* state) {
    if (!state) return;

    if (state->curve_data) {
        delete[] state->curve_data;
    }
    delete state;
}

} // extern "C"
