// AnalyserNode - FFT analysis for visualization
// Provides frequency and time domain data

#include <emscripten.h>
#include <cstring>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

struct Complex {
    float real;
    float imag;
};

extern "C" void computeFFT(Complex* data, int n, bool inverse);

struct AnalyserNodeState {
    int sample_rate;
    int channels;

    int fft_size;
    float min_decibels;
    float max_decibels;
    float smoothing_time_constant;

    // Buffers
    float* time_domain_buffer;
    Complex* fft_buffer;
    float* magnitude_buffer;
    float* smoothed_magnitude;

    int write_index;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
AnalyserNodeState* createAnalyserNode(int sample_rate, int channels) {
    AnalyserNodeState* state = new AnalyserNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->fft_size = 2048;  // Default
    state->min_decibels = -100.0f;
    state->max_decibels = -30.0f;
    state->smoothing_time_constant = 0.8f;
    state->write_index = 0;

    state->time_domain_buffer = new float[state->fft_size]();
    state->fft_buffer = new Complex[state->fft_size]();
    state->magnitude_buffer = new float[state->fft_size / 2]();
    state->smoothed_magnitude = new float[state->fft_size / 2]();

    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyAnalyserNode(AnalyserNodeState* state) {
    if (!state) return;
    delete[] state->time_domain_buffer;
    delete[] state->fft_buffer;
    delete[] state->magnitude_buffer;
    delete[] state->smoothed_magnitude;
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setAnalyserFFTSize(AnalyserNodeState* state, int fft_size) {
    if (!state || fft_size == state->fft_size) return;

    // Must be power of 2 between 32 and 32768
    if (fft_size < 32 || fft_size > 32768 || (fft_size & (fft_size - 1)) != 0) {
        return;
    }

    delete[] state->time_domain_buffer;
    delete[] state->fft_buffer;
    delete[] state->magnitude_buffer;
    delete[] state->smoothed_magnitude;

    state->fft_size = fft_size;
    state->time_domain_buffer = new float[fft_size]();
    state->fft_buffer = new Complex[fft_size]();
    state->magnitude_buffer = new float[fft_size / 2]();
    state->smoothed_magnitude = new float[fft_size / 2]();
    state->write_index = 0;
}

EMSCRIPTEN_KEEPALIVE
void setAnalyserMinDecibels(AnalyserNodeState* state, float min_decibels) {
    if (state) state->min_decibels = min_decibels;
}

EMSCRIPTEN_KEEPALIVE
void setAnalyserMaxDecibels(AnalyserNodeState* state, float max_decibels) {
    if (state) state->max_decibels = max_decibels;
}

EMSCRIPTEN_KEEPALIVE
void setAnalyserSmoothingTimeConstant(AnalyserNodeState* state, float smoothing) {
    if (state) state->smoothing_time_constant = fmaxf(0.0f, fminf(1.0f, smoothing));
}

EMSCRIPTEN_KEEPALIVE
void processAnalyserNode(
    AnalyserNodeState* state,
    float* input,
    float* output,
    int frame_count,
    bool has_input
) {
    if (!state) return;

    // Analyser is a pass-through node
    if (has_input) {
        memcpy(output, input, frame_count * state->channels * sizeof(float));

        // Store samples in circular buffer (mix down to mono)
        for (int i = 0; i < frame_count; i++) {
            float sample = 0.0f;
            for (int ch = 0; ch < state->channels; ch++) {
                sample += input[i * state->channels + ch];
            }
            sample /= state->channels;

            state->time_domain_buffer[state->write_index] = sample;
            state->write_index = (state->write_index + 1) % state->fft_size;
        }
    } else {
        memset(output, 0, frame_count * state->channels * sizeof(float));
    }
}

EMSCRIPTEN_KEEPALIVE
void getAnalyserFloatFrequencyData(AnalyserNodeState* state, float* array, int array_size) {
    if (!state || !array) return;

    // Copy time domain data in correct order
    for (int i = 0; i < state->fft_size; i++) {
        int index = (state->write_index + i) % state->fft_size;
        state->fft_buffer[i].real = state->time_domain_buffer[index];
        state->fft_buffer[i].imag = 0.0f;
    }

    // Apply Hann window
    for (int i = 0; i < state->fft_size; i++) {
        float window = 0.5f * (1.0f - cosf(2.0f * M_PI * i / state->fft_size));
        state->fft_buffer[i].real *= window;
    }

    // Compute FFT
    computeFFT(state->fft_buffer, state->fft_size, false);

    // Compute magnitudes and smooth
    const float smoothing = state->smoothing_time_constant;
    for (int i = 0; i < state->fft_size / 2 && i < array_size; i++) {
        float real = state->fft_buffer[i].real;
        float imag = state->fft_buffer[i].imag;
        float magnitude = sqrtf(real * real + imag * imag);

        // Convert to dB
        float db = 20.0f * log10f(fmaxf(magnitude, 1e-6f));

        // Smooth
        state->smoothed_magnitude[i] = smoothing * state->smoothed_magnitude[i] + (1.0f - smoothing) * db;

        // Clamp to range
        array[i] = fmaxf(state->min_decibels, fminf(state->max_decibels, state->smoothed_magnitude[i]));
    }
}

EMSCRIPTEN_KEEPALIVE
void getAnalyserFloatTimeDomainData(AnalyserNodeState* state, float* array, int array_size) {
    if (!state || !array) return;

    int length = (array_size < state->fft_size) ? array_size : state->fft_size;
    for (int i = 0; i < length; i++) {
        int index = (state->write_index + i) % state->fft_size;
        array[i] = state->time_domain_buffer[index];
    }
}

} // extern "C"
