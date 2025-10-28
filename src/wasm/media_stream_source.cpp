// MediaStreamSourceNode - Audio input capture
// Standalone implementation for microphone/audio input

#include <emscripten.h>
#include <cstring>
#include "utils/RingBuffer.h"

struct MediaStreamSourceNodeState {
    int sample_rate;
    int channels;
    bool is_active;
    RingBuffer* ring_buffer;
    size_t buffer_capacity; // in samples
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
MediaStreamSourceNodeState* createMediaStreamSourceNode(int sample_rate, int channels, float buffer_duration_seconds) {
    MediaStreamSourceNodeState* state = new MediaStreamSourceNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->is_active = false;

    // Create ring buffer with capacity for buffer_duration_seconds of audio
    state->buffer_capacity = static_cast<size_t>(sample_rate * buffer_duration_seconds * channels);
    state->ring_buffer = new RingBuffer(state->buffer_capacity);

    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyMediaStreamSourceNode(MediaStreamSourceNodeState* state) {
    if (!state) return;
    if (state->ring_buffer) {
        delete state->ring_buffer;
    }
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void startMediaStreamSource(MediaStreamSourceNodeState* state) {
    if (!state) return;
    state->is_active = true;
    if (state->ring_buffer) {
        state->ring_buffer->Clear();
    }
}

EMSCRIPTEN_KEEPALIVE
void stopMediaStreamSource(MediaStreamSourceNodeState* state) {
    if (!state) return;
    state->is_active = false;
}

// Write input data to ring buffer (called from JavaScript SDL callback)
// Returns number of samples actually written
EMSCRIPTEN_KEEPALIVE
size_t writeInputData(MediaStreamSourceNodeState* state, const float* data, size_t sample_count) {
    if (!state || !state->ring_buffer) return 0;
    return state->ring_buffer->Write(data, sample_count);
}

// Get number of samples available in ring buffer
EMSCRIPTEN_KEEPALIVE
size_t getInputDataAvailable(MediaStreamSourceNodeState* state) {
    if (!state || !state->ring_buffer) return 0;
    return state->ring_buffer->GetAvailable();
}

// Process audio - reads from ring buffer
// Note: output_channels is the graph's channel count (usually 2 for stereo)
EMSCRIPTEN_KEEPALIVE
void processMediaStreamSourceNode(
    MediaStreamSourceNodeState* state,
    float* output,
    int frame_count,
    int output_channels
) {
    if (!state) {
        return;
    }

    const int output_sample_count = frame_count * output_channels;

    if (!state->is_active) {
        memset(output, 0, output_sample_count * sizeof(float));
        return;
    }

    if (!state->ring_buffer) {
        memset(output, 0, output_sample_count * sizeof(float));
        return;
    }

    // If input and output channels match, direct copy
    if (state->channels == output_channels) {
        state->ring_buffer->Read(output, output_sample_count);
        return;
    }

    // Handle channel up-mixing/down-mixing
    if (state->channels == 1 && output_channels == 2) {
        // Mono to stereo: duplicate mono to both channels
        float* mono_buffer = new float[frame_count];
        size_t samples_read = state->ring_buffer->Read(mono_buffer, frame_count);

        for (int i = 0; i < frame_count; i++) {
            float sample = (i < samples_read) ? mono_buffer[i] : 0.0f;
            output[i * 2] = sample;     // Left
            output[i * 2 + 1] = sample; // Right
        }

        delete[] mono_buffer;
    } else if (state->channels == 2 && output_channels == 1) {
        // Stereo to mono: average both channels
        float* stereo_buffer = new float[frame_count * 2];
        size_t samples_read = state->ring_buffer->Read(stereo_buffer, frame_count * 2);

        for (int i = 0; i < frame_count; i++) {
            if (i * 2 + 1 < samples_read) {
                output[i] = (stereo_buffer[i * 2] + stereo_buffer[i * 2 + 1]) * 0.5f;
            } else {
                output[i] = 0.0f;
            }
        }

        delete[] stereo_buffer;
    } else {
        // Unsupported channel configuration - output silence
        memset(output, 0, output_sample_count * sizeof(float));
    }
}

} // extern "C"
