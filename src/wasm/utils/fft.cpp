// FFT Utility - WASM Version with SIMD
// Radix-4 FFT implementation with WASM SIMD magnitude computation

#include <cmath>
#include <algorithm>
#include <emscripten.h>

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Forward declarations for complex number handling
struct Complex {
    float real;
    float imag;
};

// FFT state structure
struct FFTState {
    int size;
    int log2_size;
    Complex* twiddle_factors;
    int* bit_reverse_table;
    Complex* temp_buffer;  // For inverse FFT
};

// Helper: Compute log2 of power of 2
static int compute_log2(int n) {
    int log2 = 0;
    while (n > 1) {
        n >>= 1;
        log2++;
    }
    return log2;
}

extern "C" {

// Create FFT instance
EMSCRIPTEN_KEEPALIVE
FFTState* createFFT(int size) {
    // Round up to power of 2 if needed
    int actual_size = 1;
    int log2_size = 0;
    while (actual_size < size) {
        actual_size *= 2;
        log2_size++;
    }

    FFTState* state = new FFTState();
    state->size = actual_size;
    state->log2_size = log2_size;

    // Allocate twiddle factors
    state->twiddle_factors = new Complex[actual_size];
    for (int i = 0; i < actual_size; ++i) {
        float angle = -2.0f * M_PI * i / actual_size;
        state->twiddle_factors[i].real = std::cos(angle);
        state->twiddle_factors[i].imag = std::sin(angle);
    }

    // Compute bit reverse table
    state->bit_reverse_table = new int[actual_size];
    for (int i = 0; i < actual_size; ++i) {
        int reversed = 0;
        int temp = i;
        for (int j = 0; j < log2_size; ++j) {
            reversed = (reversed << 1) | (temp & 1);
            temp >>= 1;
        }
        state->bit_reverse_table[i] = reversed;
    }

    // Allocate temp buffer for inverse FFT
    state->temp_buffer = new Complex[actual_size];

    return state;
}

// Bit reverse permutation
static void bitReversePermutation(Complex* data, const int* bit_reverse_table, int size) {
    for (int i = 0; i < size; ++i) {
        int j = bit_reverse_table[i];
        if (i < j) {
            Complex temp = data[i];
            data[i] = data[j];
            data[j] = temp;
        }
    }
}

// Forward FFT: real input → complex output
EMSCRIPTEN_KEEPALIVE
void forwardFFT(FFTState* state, const float* input, Complex* output) {
    if (!state || !input || !output) return;

    const int size = state->size;
    const int log2_size = state->log2_size;
    const Complex* tw = state->twiddle_factors;

    // Copy input to output as complex numbers
    for (int i = 0; i < size; ++i) {
        output[i].real = input[i];
        output[i].imag = 0.0f;
    }

    // Bit-reverse permutation
    bitReversePermutation(output, state->bit_reverse_table, size);

    // Radix-4 stages (2 bits at a time)
    int stage = 0;
    for (; stage + 1 < log2_size; stage += 2) {
        const int m = 1 << (stage + 2);  // 4 * 2^stage
        const int m4 = m >> 2;           // m/4
        const int step = size >> (stage + 2);

        for (int k = 0; k < size; k += m) {
            for (int j = 0; j < m4; ++j) {
                const int i0 = k + j;
                const int i1 = i0 + m4;
                const int i2 = i1 + m4;
                const int i3 = i2 + m4;

                // Load inputs
                const float x0r = output[i0].real;
                const float x0i = output[i0].imag;
                const float x1r = output[i1].real;
                const float x1i = output[i1].imag;
                const float x2r = output[i2].real;
                const float x2i = output[i2].imag;
                const float x3r = output[i3].real;
                const float x3i = output[i3].imag;

                // Twiddle factors
                const int tw_idx = j * step;
                const float w1r = tw[tw_idx].real;
                const float w1i = tw[tw_idx].imag;
                const float w2r = tw[tw_idx * 2].real;
                const float w2i = tw[tw_idx * 2].imag;
                const float w3r = tw[tw_idx * 3].real;
                const float w3i = tw[tw_idx * 3].imag;

                // Apply twiddles
                const float t1r = w1r * x1r - w1i * x1i;
                const float t1i = w1r * x1i + w1i * x1r;
                const float t2r = w2r * x2r - w2i * x2i;
                const float t2i = w2r * x2i + w2i * x2r;
                const float t3r = w3r * x3r - w3i * x3i;
                const float t3i = w3r * x3i + w3i * x3r;

                // Radix-4 butterfly
                const float a0r = x0r + t2r;
                const float a0i = x0i + t2i;
                const float a1r = x0r - t2r;
                const float a1i = x0i - t2i;
                const float a2r = t1r + t3r;
                const float a2i = t1i + t3i;
                const float a3r = t1r - t3r;
                const float a3i = t1i - t3i;

                output[i0].real = a0r + a2r;
                output[i0].imag = a0i + a2i;
                output[i1].real = a1r + a3i;  // Multiply by -i
                output[i1].imag = a1i - a3r;
                output[i2].real = a0r - a2r;
                output[i2].imag = a0i - a2i;
                output[i3].real = a1r - a3i;  // Multiply by i
                output[i3].imag = a1i + a3r;
            }
        }
    }

    // Remaining radix-2 stage if size is not power of 4
    if (stage < log2_size) {
        const int m = 1 << (stage + 1);
        const int m2 = m >> 1;
        const int step = size >> (stage + 1);

        for (int k = 0; k < size; k += m) {
            for (int j = 0; j < m2; ++j) {
                const int idx_top = k + j;
                const int idx_bot = idx_top + m2;

                const float tw_real = tw[j * step].real;
                const float tw_imag = tw[j * step].imag;
                const float bot_real = output[idx_bot].real;
                const float bot_imag = output[idx_bot].imag;

                const float t_real = tw_real * bot_real - tw_imag * bot_imag;
                const float t_imag = tw_real * bot_imag + tw_imag * bot_real;

                const float u_real = output[idx_top].real;
                const float u_imag = output[idx_top].imag;

                output[idx_top].real = u_real + t_real;
                output[idx_top].imag = u_imag + t_imag;
                output[idx_bot].real = u_real - t_real;
                output[idx_bot].imag = u_imag - t_imag;
            }
        }
    }
}

// Get magnitude spectrum - WASM SIMD optimized (equivalent to ARM NEON version)
EMSCRIPTEN_KEEPALIVE
void getMagnitude(const Complex* complex_data, float* magnitude, int size) {
    if (!complex_data || !magnitude) return;

#ifdef __wasm_simd128__
    // WASM SIMD version: Process 4 complex numbers at a time
    // Magnitude = sqrt(real^2 + imag^2)
    const float* data = reinterpret_cast<const float*>(complex_data);

    int i = 0;
    for (; i + 3 < size; i += 4) {
        // Load 4 complex numbers: [r0, i0, r1, i1, r2, i2, r3, i3]
        // WASM doesn't have vld2q equivalent, so load and shuffle
        v128_t c0 = wasm_v128_load(&data[i * 2]);      // [r0, i0, r1, i1]
        v128_t c1 = wasm_v128_load(&data[i * 2 + 4]);  // [r2, i2, r3, i3]

        // Shuffle to separate real and imaginary parts
        // real = [r0, r1, r2, r3], imag = [i0, i1, i2, i3]
        v128_t real = wasm_i32x4_shuffle(c0, c1, 0, 2, 4, 6);
        v128_t imag = wasm_i32x4_shuffle(c0, c1, 1, 3, 5, 7);

        // Compute real^2 and imag^2
        v128_t real_sq = wasm_f32x4_mul(real, real);
        v128_t imag_sq = wasm_f32x4_mul(imag, imag);

        // Sum: real^2 + imag^2
        v128_t sum = wasm_f32x4_add(real_sq, imag_sq);

        // Square root
        v128_t mag = wasm_f32x4_sqrt(sum);

        // Store
        wasm_v128_store(&magnitude[i], mag);
    }

    // Handle remaining elements (scalar)
    for (; i < size; ++i) {
        float real = complex_data[i].real;
        float imag = complex_data[i].imag;
        magnitude[i] = std::sqrt(real * real + imag * imag);
    }
#else
    // Scalar fallback
    for (int i = 0; i < size; ++i) {
        float real = complex_data[i].real;
        float imag = complex_data[i].imag;
        magnitude[i] = std::sqrt(real * real + imag * imag);
    }
#endif
}

// Convert magnitude to decibels
EMSCRIPTEN_KEEPALIVE
void magnitudeToDecibels(const float* magnitude, float* decibels, int size, float min_db, float max_db) {
    if (!magnitude || !decibels) return;

    for (int i = 0; i < size; ++i) {
        // Convert magnitude to decibels: 20 * log10(magnitude)
        // Avoid log(0) by clamping to minimum value
        float mag = std::max(magnitude[i], 1e-10f);
        float db = 20.0f * std::log10(mag);

        // Clamp to range
        db = std::max(min_db, std::min(max_db, db));
        decibels[i] = db;
    }
}

// Inverse FFT: complex input → real output
EMSCRIPTEN_KEEPALIVE
void inverseFFT(FFTState* state, const Complex* input, float* output) {
    if (!state || !input || !output) return;

    const int size = state->size;
    const int log2_size = state->log2_size;
    const Complex* tw = state->twiddle_factors;
    Complex* temp = state->temp_buffer;

    // Copy and conjugate input
    for (int i = 0; i < size; ++i) {
        temp[i].real = input[i].real;
        temp[i].imag = -input[i].imag;  // Conjugate
    }

    // Bit-reverse permutation
    bitReversePermutation(temp, state->bit_reverse_table, size);

    // Radix-4 stages (same as forward)
    int stage = 0;
    for (; stage + 1 < log2_size; stage += 2) {
        const int m = 1 << (stage + 2);
        const int m4 = m >> 2;
        const int step = size >> (stage + 2);

        for (int k = 0; k < size; k += m) {
            for (int j = 0; j < m4; ++j) {
                const int i0 = k + j;
                const int i1 = i0 + m4;
                const int i2 = i1 + m4;
                const int i3 = i2 + m4;

                const float x0r = temp[i0].real;
                const float x0i = temp[i0].imag;
                const float x1r = temp[i1].real;
                const float x1i = temp[i1].imag;
                const float x2r = temp[i2].real;
                const float x2i = temp[i2].imag;
                const float x3r = temp[i3].real;
                const float x3i = temp[i3].imag;

                const int tw_idx = j * step;
                const float w1r = tw[tw_idx].real;
                const float w1i = tw[tw_idx].imag;
                const float w2r = tw[tw_idx * 2].real;
                const float w2i = tw[tw_idx * 2].imag;
                const float w3r = tw[tw_idx * 3].real;
                const float w3i = tw[tw_idx * 3].imag;

                const float t1r = w1r * x1r - w1i * x1i;
                const float t1i = w1r * x1i + w1i * x1r;
                const float t2r = w2r * x2r - w2i * x2i;
                const float t2i = w2r * x2i + w2i * x2r;
                const float t3r = w3r * x3r - w3i * x3i;
                const float t3i = w3r * x3i + w3i * x3r;

                const float a0r = x0r + t2r;
                const float a0i = x0i + t2i;
                const float a1r = x0r - t2r;
                const float a1i = x0i - t2i;
                const float a2r = t1r + t3r;
                const float a2i = t1i + t3i;
                const float a3r = t1r - t3r;
                const float a3i = t1i - t3i;

                temp[i0].real = a0r + a2r;
                temp[i0].imag = a0i + a2i;
                temp[i1].real = a1r + a3i;
                temp[i1].imag = a1i - a3r;
                temp[i2].real = a0r - a2r;
                temp[i2].imag = a0i - a2i;
                temp[i3].real = a1r - a3i;
                temp[i3].imag = a1i + a3r;
            }
        }
    }

    // Remaining radix-2 stage
    if (stage < log2_size) {
        const int m = 1 << (stage + 1);
        const int m2 = m >> 1;
        const int step = size >> (stage + 1);

        for (int k = 0; k < size; k += m) {
            for (int j = 0; j < m2; ++j) {
                const int idx_top = k + j;
                const int idx_bot = idx_top + m2;

                const float tw_real = tw[j * step].real;
                const float tw_imag = tw[j * step].imag;
                const float bot_real = temp[idx_bot].real;
                const float bot_imag = temp[idx_bot].imag;

                const float t_real = tw_real * bot_real - tw_imag * bot_imag;
                const float t_imag = tw_real * bot_imag + tw_imag * bot_real;

                const float u_real = temp[idx_top].real;
                const float u_imag = temp[idx_top].imag;

                temp[idx_top].real = u_real + t_real;
                temp[idx_top].imag = u_imag + t_imag;
                temp[idx_bot].real = u_real - t_real;
                temp[idx_bot].imag = u_imag - t_imag;
            }
        }
    }

    // Conjugate and normalize by 1/N
    const float scale = 1.0f / size;
    for (int i = 0; i < size; ++i) {
        output[i] = temp[i].real * scale;
    }
}

// Destroy FFT instance
EMSCRIPTEN_KEEPALIVE
void destroyFFT(FFTState* state) {
    if (!state) return;

    delete[] state->twiddle_factors;
    delete[] state->bit_reverse_table;
    delete[] state->temp_buffer;
    delete state;
}

// Simple in-place FFT for AnalyserNode and ConvolverNode
// This is a Cooley-Tukey radix-2 implementation
EMSCRIPTEN_KEEPALIVE
void computeFFT(Complex* data, int n, bool inverse) {
    if (n <= 1) return;

    // Bit-reversal permutation
    int j = 0;
    for (int i = 0; i < n - 1; i++) {
        if (i < j) {
            Complex temp = data[i];
            data[i] = data[j];
            data[j] = temp;
        }
        int k = n / 2;
        while (k <= j) {
            j -= k;
            k /= 2;
        }
        j += k;
    }

    // FFT computation
    float direction = inverse ? 1.0f : -1.0f;

    for (int size = 2; size <= n; size *= 2) {
        int half_size = size / 2;
        float step = direction * 2.0f * M_PI / size;

        for (int i = 0; i < n; i += size) {
            for (int j = 0; j < half_size; j++) {
                float angle = step * j;
                float cos_val = std::cos(angle);
                float sin_val = std::sin(angle);

                Complex w;
                w.real = cos_val;
                w.imag = sin_val;

                int idx1 = i + j;
                int idx2 = i + j + half_size;

                Complex t;
                t.real = w.real * data[idx2].real - w.imag * data[idx2].imag;
                t.imag = w.real * data[idx2].imag + w.imag * data[idx2].real;

                Complex u = data[idx1];

                data[idx1].real = u.real + t.real;
                data[idx1].imag = u.imag + t.imag;

                data[idx2].real = u.real - t.real;
                data[idx2].imag = u.imag - t.imag;
            }
        }
    }

    // Normalize inverse FFT
    if (inverse) {
        float scale = 1.0f / n;
        for (int i = 0; i < n; i++) {
            data[i].real *= scale;
            data[i].imag *= scale;
        }
    }
}

} // extern "C"
