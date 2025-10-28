// DelayNode - Circular buffer implementation
// Web Audio API compliant delay with fractional delay interpolation

#include <emscripten.h>
#include <cstring>
#include <cmath>

struct DelayNodeState {
    int sample_rate;
    int channels;
    float max_delay_time;
    float current_delay_time;

    float** delay_buffers;  // One buffer per channel
    int buffer_length;
    int write_index;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
DelayNodeState* createDelayNode(int sample_rate, int channels, float max_delay_time) {
    DelayNodeState* state = new DelayNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->max_delay_time = max_delay_time;
    state->current_delay_time = 0.0f;

    // Allocate circular buffers (max delay + 1 second safety margin)
    state->buffer_length = static_cast<int>((max_delay_time + 1.0f) * sample_rate);
    state->delay_buffers = new float*[channels];
    for (int ch = 0; ch < channels; ch++) {
        state->delay_buffers[ch] = new float[state->buffer_length]();
    }

    state->write_index = 0;

    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyDelayNode(DelayNodeState* state) {
    if (!state) return;
    for (int ch = 0; ch < state->channels; ch++) {
        delete[] state->delay_buffers[ch];
    }
    delete[] state->delay_buffers;
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setDelayTime(DelayNodeState* state, float delay_time) {
    if (!state) return;
    // Clamp to max delay time
    state->current_delay_time = fminf(delay_time, state->max_delay_time);
}

EMSCRIPTEN_KEEPALIVE
void processDelayNode(
    DelayNodeState* state,
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

    const int buffer_length = state->buffer_length;
    const float delay_samples = state->current_delay_time * state->sample_rate;

    for (int i = 0; i < frame_count; i++) {
        for (int ch = 0; ch < state->channels; ch++) {
            const int idx = i * state->channels + ch;
            const float input_sample = input[idx];

            // Write to delay buffer
            state->delay_buffers[ch][state->write_index] = input_sample;

            // Read from delay buffer with linear interpolation
            const float read_position = state->write_index - delay_samples;
            const int read_index1 = static_cast<int>(floorf(read_position));
            const int read_index2 = read_index1 + 1;
            const float frac = read_position - read_index1;

            // Wrap indices
            const int wrapped_index1 = (read_index1 + buffer_length) % buffer_length;
            const int wrapped_index2 = (read_index2 + buffer_length) % buffer_length;

            // Linear interpolation
            const float sample1 = state->delay_buffers[ch][wrapped_index1];
            const float sample2 = state->delay_buffers[ch][wrapped_index2];
            output[idx] = sample1 + frac * (sample2 - sample1);
        }

        state->write_index = (state->write_index + 1) % buffer_length;
    }
}

} // extern "C"
