// AudioBufferSourceNode WASM implementation
// Plays back audio buffer data with SIMD optimization

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cstring>
#include <cstdio>
#include <cmath>

// AudioBufferSourceNode state
struct BufferSourceNodeState {
    int sample_rate;
    int channels;
    bool is_active;
    bool loop;

    // Buffer data (owned by this node)
    float* buffer_data;
    int buffer_frames;
    int buffer_channels;

    // Playback position
    int current_frame;

    // Scheduled timing
    double scheduled_start_time;
    double scheduled_stop_time;
    double current_time;
    bool has_started;
    bool has_stopped;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
BufferSourceNodeState* createBufferSourceNode(int sample_rate, int channels) {
    BufferSourceNodeState* state = new BufferSourceNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->is_active = false;
    state->loop = false;
    state->buffer_data = nullptr;
    state->buffer_frames = 0;
    state->buffer_channels = 0;
    state->current_frame = 0;
    state->scheduled_start_time = -1.0;
    state->scheduled_stop_time = -1.0;
    state->current_time = 0.0;
    state->has_started = false;
    state->has_stopped = false;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyBufferSourceNode(BufferSourceNodeState* state) {
    if (!state) return;

    if (state->buffer_data) {
        delete[] state->buffer_data;
    }

    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setBufferSourceBuffer(BufferSourceNodeState* state, float* buffer_data, int buffer_frames, int buffer_channels) {
    if (!state) return;

    // Free old buffer if exists
    if (state->buffer_data) {
        delete[] state->buffer_data;
    }

    // Allocate and copy buffer data
    int total_samples = buffer_frames * buffer_channels;
    state->buffer_data = new float[total_samples];
    memcpy(state->buffer_data, buffer_data, total_samples * sizeof(float));

    state->buffer_frames = buffer_frames;
    state->buffer_channels = buffer_channels;
    state->current_frame = 0;
}

EMSCRIPTEN_KEEPALIVE
void startBufferSource(BufferSourceNodeState* state, double when) {
    if (!state) return;
    state->scheduled_start_time = when;
    state->has_started = false;
    state->has_stopped = false;
    state->current_frame = 0;
    // Don't activate immediately - will activate when current_time >= scheduled_start_time
}

EMSCRIPTEN_KEEPALIVE
void setBufferSourceCurrentTime(BufferSourceNodeState* state, double time) {
    if (!state) return;
    state->current_time = time;

    // Check if we should start
    if (!state->has_started && state->scheduled_start_time >= 0.0 && state->current_time >= state->scheduled_start_time) {
        state->has_started = true;
        state->is_active = true;
    }

    // Check if we should stop
    if (state->has_started && !state->has_stopped && state->scheduled_stop_time >= 0.0 && state->current_time >= state->scheduled_stop_time) {
        state->has_stopped = true;
        state->is_active = false;
    }
}

EMSCRIPTEN_KEEPALIVE
void stopBufferSource(BufferSourceNodeState* state, double when) {
    if (!state) return;
    state->scheduled_stop_time = when;
    // Will actually stop when current_time >= scheduled_stop_time (checked in setBufferSourceCurrentTime)
}

EMSCRIPTEN_KEEPALIVE
void setBufferSourceLoop(BufferSourceNodeState* state, bool loop) {
    if (!state) return;
    state->loop = loop;
}

// Copy buffer data with SIMD optimization
static void CopyBufferData(
    const float* src,
    float* dst,
    int sample_count
) {
    int i = 0;

#ifdef __wasm_simd128__
    // Process 4 samples at a time with SIMD
    for (; i + 4 <= sample_count; i += 4) {
        v128_t data = wasm_v128_load(&src[i]);
        wasm_v128_store(&dst[i], data);
    }
#endif

    // Scalar tail for remaining samples
    for (; i < sample_count; ++i) {
        dst[i] = src[i];
    }
}

EMSCRIPTEN_KEEPALIVE
void processBufferSourceNode(
    BufferSourceNodeState* state,
    float* output,
    int frame_count
) {
    if (!state) return;

    const int output_samples = frame_count * state->channels;

    // If not active or no buffer, output silence
    if (!state->is_active || !state->buffer_data || state->buffer_frames == 0) {
        memset(output, 0, output_samples * sizeof(float));
        return;
    }

    int frames_written = 0;

    while (frames_written < frame_count) {
        // Check if we've reached the end of the buffer
        if (state->current_frame >= state->buffer_frames) {
            if (state->loop) {
                state->current_frame = 0;
            } else {
                // Fill rest with silence
                int remaining_samples = (frame_count - frames_written) * state->channels;
                memset(&output[frames_written * state->channels], 0, remaining_samples * sizeof(float));
                state->is_active = false;
                break;
            }
        }

        // Calculate how many frames we can copy from current position
        int frames_available = state->buffer_frames - state->current_frame;
        int frames_to_copy = (frame_count - frames_written < frames_available)
                           ? (frame_count - frames_written)
                           : frames_available;

        // Handle channel mismatch
        if (state->buffer_channels == state->channels) {
            // Same channel count - direct SIMD copy
            const float* src = &state->buffer_data[state->current_frame * state->buffer_channels];
            float* dst = &output[frames_written * state->channels];
            int samples_to_copy = frames_to_copy * state->channels;

            CopyBufferData(src, dst, samples_to_copy);

        } else if (state->buffer_channels == 1 && state->channels > 1) {
            // Mono buffer to multi-channel output (upmix)
            for (int frame = 0; frame < frames_to_copy; ++frame) {
                float sample = state->buffer_data[state->current_frame + frame];

#ifdef __wasm_simd128__
                if (state->channels >= 4) {
                    v128_t sample_vec = wasm_f32x4_splat(sample);
                    int ch = 0;
                    for (; ch + 4 <= state->channels; ch += 4) {
                        int idx = (frames_written + frame) * state->channels + ch;
                        wasm_v128_store(&output[idx], sample_vec);
                    }
                    // Remaining channels
                    for (; ch < state->channels; ++ch) {
                        output[(frames_written + frame) * state->channels + ch] = sample;
                    }
                } else
#endif
                {
                    for (int ch = 0; ch < state->channels; ++ch) {
                        output[(frames_written + frame) * state->channels + ch] = sample;
                    }
                }
            }

        } else {
            // Other channel mismatches - simple copy/zero strategy
            for (int frame = 0; frame < frames_to_copy; ++frame) {
                int min_channels = (state->buffer_channels < state->channels)
                                 ? state->buffer_channels
                                 : state->channels;

                // Copy available channels
                for (int ch = 0; ch < min_channels; ++ch) {
                    output[(frames_written + frame) * state->channels + ch] =
                        state->buffer_data[(state->current_frame + frame) * state->buffer_channels + ch];
                }

                // Zero remaining channels if output has more channels
                for (int ch = min_channels; ch < state->channels; ++ch) {
                    output[(frames_written + frame) * state->channels + ch] = 0.0f;
                }
            }
        }

        frames_written += frames_to_copy;
        state->current_frame += frames_to_copy;
    }
}

} // extern "C"
