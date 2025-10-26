// Mixer Utility - WASM Version with SIMD
// Audio buffer mixing and manipulation

#include <cstring>
#include <algorithm>
#include <emscripten.h>

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

extern "C" {

// SIMD-optimized mixing: dest[i] += src[i] * gain
EMSCRIPTEN_KEEPALIVE
void mix(float* dest, const float* src, int sample_count, float gain) {
    int i = 0;

#ifdef __wasm_simd128__
    // WASM SIMD: Process 4 samples at once
    v128_t gain_vec = wasm_f32x4_splat(gain);
    for (; i + 4 <= sample_count; i += 4) {
        v128_t dest_vec = wasm_v128_load(&dest[i]);
        v128_t src_vec = wasm_v128_load(&src[i]);

        // dest += src * gain (no native FMA, so separate mul + add)
        v128_t result = wasm_f32x4_add(
            dest_vec,
            wasm_f32x4_mul(src_vec, gain_vec)
        );

        wasm_v128_store(&dest[i], result);
    }
#endif

    // Scalar fallback for remaining samples
    for (; i < sample_count; ++i) {
        dest[i] += src[i] * gain;
    }
}

// Clear buffer (zero out)
EMSCRIPTEN_KEEPALIVE
void clear(float* buffer, int sample_count) {
    std::memset(buffer, 0, sample_count * sizeof(float));
}

// Copy buffer
EMSCRIPTEN_KEEPALIVE
void copy(float* dest, const float* src, int sample_count) {
    std::memcpy(dest, src, sample_count * sizeof(float));
}

// Apply gain to buffer: buffer[i] *= gain
EMSCRIPTEN_KEEPALIVE
void applyGain(float* buffer, int sample_count, float gain) {
    int i = 0;

#ifdef __wasm_simd128__
    // WASM SIMD: Process 4 samples at once
    v128_t gain_vec = wasm_f32x4_splat(gain);
    for (; i + 4 <= sample_count; i += 4) {
        v128_t buf_vec = wasm_v128_load(&buffer[i]);
        v128_t result = wasm_f32x4_mul(buf_vec, gain_vec);
        wasm_v128_store(&buffer[i], result);
    }
#endif

    // Scalar fallback
    for (; i < sample_count; ++i) {
        buffer[i] *= gain;
    }
}

// Clip buffer to range [min, max]
EMSCRIPTEN_KEEPALIVE
void clip(float* buffer, int sample_count, float min_val, float max_val) {
    int i = 0;

#ifdef __wasm_simd128__
    // WASM SIMD: Process 4 samples at once
    v128_t min_vec = wasm_f32x4_splat(min_val);
    v128_t max_vec = wasm_f32x4_splat(max_val);

    for (; i + 4 <= sample_count; i += 4) {
        v128_t buf_vec = wasm_v128_load(&buffer[i]);

        // Clamp: max(min, min(max, val))
        buf_vec = wasm_f32x4_max(buf_vec, min_vec);
        buf_vec = wasm_f32x4_min(buf_vec, max_vec);

        wasm_v128_store(&buffer[i], buf_vec);
    }
#endif

    // Scalar fallback
    for (; i < sample_count; ++i) {
        buffer[i] = std::max(min_val, std::min(max_val, buffer[i]));
    }
}

} // extern "C"
