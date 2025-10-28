// ConvolverNode - FFT-based convolution for reverb
// Uses overlap-add method for efficient real-time convolution

#include <emscripten.h>
#include <cstring>
#include <cmath>
#include <algorithm>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

struct Complex {
    float real;
    float imag;
};

// FFT forward declaration (from utils/fft.cpp)
extern "C" void computeFFT(Complex* data, int n, bool inverse);

struct ConvolverNodeState {
    int sample_rate;
    int channels;
    bool normalize;

    // Impulse response
    float** ir_buffers;  // Per channel
    int ir_length;

    // FFT buffers for overlap-add
    int fft_size;
    int block_size;
    Complex** ir_fft;  // Pre-computed FFT of IR per channel
    Complex** fft_buffer;  // Working buffer for input FFT
    float** overlap_buffer;  // Overlap from previous block
    float** input_buffer;  // Accumulate input samples
    int input_pos;
};

// Find next power of 2
static int nextPowerOf2(int n) {
    int power = 1;
    while (power < n) power *= 2;
    return power;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
ConvolverNodeState* createConvolverNode(int sample_rate, int channels) {
    ConvolverNodeState* state = new ConvolverNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->normalize = true;
    state->ir_buffers = nullptr;
    state->ir_length = 0;
    state->ir_fft = nullptr;
    state->fft_buffer = nullptr;
    state->overlap_buffer = nullptr;
    state->input_buffer = nullptr;
    state->input_pos = 0;
    state->fft_size = 0;
    state->block_size = 0;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyConvolverNode(ConvolverNodeState* state) {
    if (!state) return;

    if (state->ir_buffers) {
        for (int ch = 0; ch < state->channels; ch++) {
            delete[] state->ir_buffers[ch];
        }
        delete[] state->ir_buffers;
    }

    if (state->ir_fft) {
        for (int ch = 0; ch < state->channels; ch++) {
            delete[] state->ir_fft[ch];
        }
        delete[] state->ir_fft;
    }

    if (state->fft_buffer) {
        for (int ch = 0; ch < state->channels; ch++) {
            delete[] state->fft_buffer[ch];
        }
        delete[] state->fft_buffer;
    }

    if (state->overlap_buffer) {
        for (int ch = 0; ch < state->channels; ch++) {
            delete[] state->overlap_buffer[ch];
        }
        delete[] state->overlap_buffer;
    }

    if (state->input_buffer) {
        for (int ch = 0; ch < state->channels; ch++) {
            delete[] state->input_buffer[ch];
        }
        delete[] state->input_buffer;
    }

    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setConvolverBuffer(ConvolverNodeState* state, float* buffer_data, int length, int num_channels) {
    if (!state) return;

    // Clean up old buffers
    if (state->ir_buffers) {
        for (int ch = 0; ch < state->channels; ch++) {
            delete[] state->ir_buffers[ch];
            delete[] state->ir_fft[ch];
            delete[] state->fft_buffer[ch];
            delete[] state->overlap_buffer[ch];
            delete[] state->input_buffer[ch];
        }
        delete[] state->ir_buffers;
        delete[] state->ir_fft;
        delete[] state->fft_buffer;
        delete[] state->overlap_buffer;
        delete[] state->input_buffer;
    }

    state->ir_length = length;
    state->block_size = 512; // Process in 512-sample blocks
    state->fft_size = nextPowerOf2(state->block_size + length - 1);

    // Allocate new buffers
    state->ir_buffers = new float*[state->channels];
    state->ir_fft = new Complex*[state->channels];
    state->fft_buffer = new Complex*[state->channels];
    state->overlap_buffer = new float*[state->channels];
    state->input_buffer = new float*[state->channels];

    // Calculate normalization factor if needed
    float norm_factor = 1.0f;
    if (state->normalize && length > 0) {
        float max_val = 0.0f;
        for (int i = 0; i < length * num_channels; i++) {
            max_val = fmaxf(max_val, fabsf(buffer_data[i]));
        }
        if (max_val > 0.0f) {
            norm_factor = 1.0f / max_val;
        }
    }

    // De-interleave and prepare impulse response
    for (int ch = 0; ch < state->channels; ch++) {
        state->ir_buffers[ch] = new float[length];
        state->ir_fft[ch] = new Complex[state->fft_size];
        state->fft_buffer[ch] = new Complex[state->fft_size];
        state->overlap_buffer[ch] = new float[state->fft_size]();
        state->input_buffer[ch] = new float[state->block_size](); // Now sized to match IR

        // Copy and normalize IR
        int src_channel = (ch < num_channels) ? ch : 0;
        for (int i = 0; i < length; i++) {
            state->ir_buffers[ch][i] = buffer_data[i * num_channels + src_channel] * norm_factor;
        }

        // Pre-compute FFT of impulse response (not used in direct convolution, but keep for compatibility)
        for (int i = 0; i < length; i++) {
            state->ir_fft[ch][i].real = state->ir_buffers[ch][i];
            state->ir_fft[ch][i].imag = 0.0f;
        }
        for (int i = length; i < state->fft_size; i++) {
            state->ir_fft[ch][i].real = 0.0f;
            state->ir_fft[ch][i].imag = 0.0f;
        }
        computeFFT(state->ir_fft[ch], state->fft_size, false);
    }

    state->input_pos = 0;
}

EMSCRIPTEN_KEEPALIVE
void setConvolverNormalize(ConvolverNodeState* state, bool normalize) {
    if (state) state->normalize = normalize;
}

EMSCRIPTEN_KEEPALIVE
void processConvolverNode(
    ConvolverNodeState* state,
    float* input,
    float* output,
    int frame_count,
    bool has_input
) {
    if (!state || !state->ir_buffers || !has_input) {
        memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    // FFT-based overlap-add convolution
    // Process frame by frame, accumulating into blocks
    for (int frame = 0; frame < frame_count; frame++) {
        for (int ch = 0; ch < state->channels; ch++) {
            // Accumulate input samples
            state->input_buffer[ch][state->input_pos] = input[frame * state->channels + ch];

            // Output from overlap buffer
            output[frame * state->channels + ch] = state->overlap_buffer[ch][frame];
        }

        state->input_pos++;

        // When we have a full block, process it with FFT
        if (state->input_pos >= state->block_size) {
            for (int ch = 0; ch < state->channels; ch++) {
                // Prepare input FFT buffer
                for (int i = 0; i < state->block_size; i++) {
                    state->fft_buffer[ch][i].real = state->input_buffer[ch][i];
                    state->fft_buffer[ch][i].imag = 0.0f;
                }
                for (int i = state->block_size; i < state->fft_size; i++) {
                    state->fft_buffer[ch][i].real = 0.0f;
                    state->fft_buffer[ch][i].imag = 0.0f;
                }

                // FFT of input
                computeFFT(state->fft_buffer[ch], state->fft_size, false);

                // Complex multiplication with IR FFT
                for (int i = 0; i < state->fft_size; i++) {
                    Complex a = state->fft_buffer[ch][i];
                    Complex b = state->ir_fft[ch][i];
                    state->fft_buffer[ch][i].real = a.real * b.real - a.imag * b.imag;
                    state->fft_buffer[ch][i].imag = a.real * b.imag + a.imag * b.real;
                }

                // Inverse FFT
                computeFFT(state->fft_buffer[ch], state->fft_size, true);

                // Add to overlap buffer (AFTER shifting!)
                for (int i = 0; i < state->fft_size; i++) {
                    state->overlap_buffer[ch][i] += state->fft_buffer[ch][i].real;
                }
            }

            state->input_pos = 0;
        }
    }

    // Shift overlap buffer by frame_count samples
    for (int ch = 0; ch < state->channels; ch++) {
        memmove(state->overlap_buffer[ch],
                state->overlap_buffer[ch] + frame_count,
                (state->fft_size - frame_count) * sizeof(float));
        memset(state->overlap_buffer[ch] + (state->fft_size - frame_count), 0,
               frame_count * sizeof(float));
    }
}

} // extern "C"
