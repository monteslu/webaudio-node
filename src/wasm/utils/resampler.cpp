// Resampler Utility - WASM Version
// Linear interpolation resampling

#include <cmath>
#include <emscripten.h>

// Resampler state structure
struct ResamplerState {
    int channels;
    double ratio;       // source_rate / dest_rate
    double position;    // Current position in source buffer
};

extern "C" {

// Create resampler instance
EMSCRIPTEN_KEEPALIVE
ResamplerState* createResampler(int source_rate, int dest_rate, int channels) {
    ResamplerState* state = new ResamplerState();
    state->channels = channels;
    state->ratio = static_cast<double>(source_rate) / static_cast<double>(dest_rate);
    state->position = 0.0;
    return state;
}

// Process resampling
// Returns actual number of output frames written
EMSCRIPTEN_KEEPALIVE
int processResampler(
    ResamplerState* state,
    const float* input,
    int input_frames,
    float* output,
    int max_output_frames
) {
    if (!state || !input || !output) return 0;

    // Simple linear interpolation resampling
    int out_idx = 0;
    const int channels = state->channels;
    double position = state->position;
    const double ratio = state->ratio;

    for (int i = 0; i < max_output_frames && position < input_frames - 1; ++i) {
        int idx1 = static_cast<int>(position);
        int idx2 = idx1 + 1;
        double frac = position - idx1;

        // Interpolate all channels
        for (int ch = 0; ch < channels; ++ch) {
            float sample1 = input[idx1 * channels + ch];
            float sample2 = input[idx2 * channels + ch];
            output[out_idx * channels + ch] = sample1 + frac * (sample2 - sample1);
        }

        out_idx++;
        position += ratio;
    }

    // Update state position (wrap fractional part)
    state->position = position - static_cast<int>(position);

    return out_idx;  // Return actual frames written
}

// Reset resampler position
EMSCRIPTEN_KEEPALIVE
void resetResampler(ResamplerState* state) {
    if (!state) return;
    state->position = 0.0;
}

// Destroy resampler instance
EMSCRIPTEN_KEEPALIVE
void destroyResampler(ResamplerState* state) {
    if (!state) return;
    delete state;
}

} // extern "C"
