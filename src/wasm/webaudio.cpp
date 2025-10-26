// WebAudio WASM - Unified Build
// Contains all audio nodes and utilities in a single WASM module

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cmath>
#include <cstring>
#include <vector>
#include <algorithm>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// ============================================================================
// AudioParam - Parameter automation
// ============================================================================

enum class EventType {
    SET_VALUE = 0,
    LINEAR_RAMP = 1,
    EXPONENTIAL_RAMP = 2,
    SET_TARGET = 3,
    SET_CURVE = 4
};

struct AutomationEvent {
    EventType type;
    double time;
    float value;
    double time_constant;
    double duration;
    float* curve_values;
    int curve_length;
};

struct AudioParamState {
    float current_value;
    float default_value;
    float min_value;
    float max_value;
    std::vector<AutomationEvent> events;
    double last_time;
    float last_computed_value;
};

static inline float ClampValue(float value, float min_val, float max_val) {
    if (value < min_val) return min_val;
    if (value > max_val) return max_val;
    return value;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
AudioParamState* createAudioParam(float default_value, float min_value, float max_value) {
    AudioParamState* state = new AudioParamState();
    state->current_value = default_value;
    state->default_value = default_value;
    state->min_value = min_value;
    state->max_value = max_value;
    state->last_time = 0.0;
    state->last_computed_value = default_value;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyAudioParam(AudioParamState* state) {
    if (!state) return;
    for (auto& event : state->events) {
        if (event.curve_values) {
            delete[] event.curve_values;
        }
    }
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setParamValue(AudioParamState* state, float value) {
    if (!state) return;
    state->current_value = ClampValue(value, state->min_value, state->max_value);
}

EMSCRIPTEN_KEEPALIVE
float getParamValue(AudioParamState* state) {
    if (!state) return 0.0f;
    return state->current_value;
}

} // extern "C"

// ============================================================================
// OscillatorNode - Wave generation
// ============================================================================

enum class WaveType {
    SINE = 0,
    SQUARE = 1,
    SAWTOOTH = 2,
    TRIANGLE = 3,
    CUSTOM = 4
};

struct OscillatorNodeState {
    int sample_rate;
    int channels;
    bool is_active;
    WaveType wave_type;
    double phase;
    float* custom_wavetable;
    int wavetable_size;
};

static inline float GenerateSample(OscillatorNodeState* state) {
    float sample = 0.0f;
    double phase = state->phase;

    switch (state->wave_type) {
        case WaveType::SINE:
            sample = std::sin(2.0 * M_PI * phase);
            break;
        case WaveType::SQUARE:
            sample = (phase < 0.5) ? 1.0f : -1.0f;
            break;
        case WaveType::SAWTOOTH:
            sample = 2.0f * phase - 1.0f;
            break;
        case WaveType::TRIANGLE:
            if (phase < 0.5) {
                sample = 4.0f * phase - 1.0f;
            } else {
                sample = -4.0f * phase + 3.0f;
            }
            break;
        case WaveType::CUSTOM:
            if (state->custom_wavetable && state->wavetable_size > 0) {
                double index = phase * state->wavetable_size;
                int i0 = static_cast<int>(index) % state->wavetable_size;
                int i1 = (i0 + 1) % state->wavetable_size;
                float frac = index - std::floor(index);
                sample = state->custom_wavetable[i0] * (1.0f - frac) +
                         state->custom_wavetable[i1] * frac;
            }
            break;
    }
    return sample;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
OscillatorNodeState* createOscillatorNode(int sample_rate, int channels, int wave_type_int) {
    OscillatorNodeState* state = new OscillatorNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->is_active = false;
    state->wave_type = static_cast<WaveType>(wave_type_int);
    state->phase = 0.0;
    state->custom_wavetable = nullptr;
    state->wavetable_size = 0;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyOscillatorNode(OscillatorNodeState* state) {
    if (!state) return;
    if (state->custom_wavetable) {
        delete[] state->custom_wavetable;
    }
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void startOscillator(OscillatorNodeState* state) {
    if (!state) return;
    state->is_active = true;
    state->phase = 0.0;
}

EMSCRIPTEN_KEEPALIVE
void stopOscillator(OscillatorNodeState* state) {
    if (!state) return;
    state->is_active = false;
}

EMSCRIPTEN_KEEPALIVE
void setOscillatorWaveType(OscillatorNodeState* state, int wave_type_int) {
    if (!state) return;
    state->wave_type = static_cast<WaveType>(wave_type_int);
}

EMSCRIPTEN_KEEPALIVE
void processOscillatorNode(
    OscillatorNodeState* state,
    float* output,
    int frame_count,
    float frequency,
    float detune
) {
    if (!state) return;

    if (!state->is_active) {
        memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    float detune_multiplier = std::pow(2.0f, detune / 1200.0f);
    float actual_frequency = frequency * detune_multiplier;
    double phase_increment = actual_frequency / static_cast<double>(state->sample_rate);

    // Optimized sawtooth path
    if (state->wave_type == WaveType::SAWTOOTH) {
        for (int frame = 0; frame < frame_count; ++frame) {
            float sample = 2.0f * state->phase - 1.0f;

#ifdef __wasm_simd128__
            if (state->channels >= 4) {
                v128_t sample_vec = wasm_f32x4_splat(sample);
                int ch = 0;
                for (; ch + 4 <= state->channels; ch += 4) {
                    wasm_v128_store(&output[frame * state->channels + ch], sample_vec);
                }
                for (; ch < state->channels; ++ch) {
                    output[frame * state->channels + ch] = sample;
                }
            } else
#endif
            {
                for (int ch = 0; ch < state->channels; ++ch) {
                    output[frame * state->channels + ch] = sample;
                }
            }

            state->phase += phase_increment;
            if (state->phase >= 1.0) {
                state->phase -= 1.0;
            }
        }
    } else {
        // General path
        for (int frame = 0; frame < frame_count; ++frame) {
            float sample = GenerateSample(state);

#ifdef __wasm_simd128__
            if (state->channels >= 4) {
                v128_t sample_vec = wasm_f32x4_splat(sample);
                int ch = 0;
                for (; ch + 4 <= state->channels; ch += 4) {
                    wasm_v128_store(&output[frame * state->channels + ch], sample_vec);
                }
                for (; ch < state->channels; ++ch) {
                    output[frame * state->channels + ch] = sample;
                }
            } else
#endif
            {
                for (int ch = 0; ch < state->channels; ++ch) {
                    output[frame * state->channels + ch] = sample;
                }
            }

            state->phase += phase_increment;
            if (state->phase >= 1.0) {
                state->phase -= 1.0;
            }
        }
    }
}

} // extern "C"

// ============================================================================
// GainNode - Volume control
// ============================================================================

struct GainNodeState {
    int sample_rate;
    int channels;
    bool is_active;
};

static void ApplyGain(float* buffer, int sample_count, float gain) {
    if (gain == 1.0f) return;

    int i = 0;
#ifdef __wasm_simd128__
    v128_t gain_vec = wasm_f32x4_splat(gain);
    for (; i + 4 <= sample_count; i += 4) {
        v128_t data = wasm_v128_load(&buffer[i]);
        data = wasm_f32x4_mul(data, gain_vec);
        wasm_v128_store(&buffer[i], data);
    }
#endif
    for (; i < sample_count; ++i) {
        buffer[i] *= gain;
    }
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
GainNodeState* createGainNode(int sample_rate, int channels) {
    GainNodeState* state = new GainNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->is_active = true;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyGainNode(GainNodeState* state) {
    if (!state) return;
    delete state;
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

    if (!has_input) {
        memset(output, 0, sample_count * sizeof(float));
        return;
    }

    if (input != output) {
        memcpy(output, input, sample_count * sizeof(float));
    }

    ApplyGain(output, sample_count, gain);
}

} // extern "C"

// ============================================================================
// BufferSourceNode - Audio buffer playback
// ============================================================================

struct BufferSourceNodeState {
    int sample_rate;
    int channels;
    bool is_active;
    bool has_started;

    float* buffer_data;
    int buffer_length;      // in frames
    int buffer_channels;
    double playback_position;  // in frames

    bool loop;
    float playback_rate;
    double loop_start;      // in seconds
    double loop_end;        // in seconds
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
BufferSourceNodeState* createBufferSourceNode(int sample_rate, int channels) {
    BufferSourceNodeState* state = new BufferSourceNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->is_active = false;
    state->has_started = false;
    state->buffer_data = nullptr;
    state->buffer_length = 0;
    state->buffer_channels = 0;
    state->playback_position = 0.0;
    state->loop = false;
    state->playback_rate = 1.0f;
    state->loop_start = 0.0;
    state->loop_end = 0.0;
    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyBufferSourceNode(BufferSourceNodeState* state) {
    if (!state) return;
    // Note: buffer_data is managed by JS side (WASM heap)
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setBufferSourceBuffer(BufferSourceNodeState* state, float* buffer_data, int length, int num_channels) {
    if (!state) return;
    state->buffer_data = buffer_data;
    state->buffer_length = length;
    state->buffer_channels = num_channels;
    state->playback_position = 0.0;
}

EMSCRIPTEN_KEEPALIVE
void startBufferSource(BufferSourceNodeState* state) {
    if (!state) return;
    state->has_started = true;
    state->is_active = true;
    state->playback_position = 0.0;
}

EMSCRIPTEN_KEEPALIVE
void stopBufferSource(BufferSourceNodeState* state) {
    if (!state) return;
    state->is_active = false;
}

EMSCRIPTEN_KEEPALIVE
void setBufferSourceLoop(BufferSourceNodeState* state, bool loop) {
    if (!state) return;
    state->loop = loop;
}

EMSCRIPTEN_KEEPALIVE
void setBufferSourcePlaybackRate(BufferSourceNodeState* state, float rate) {
    if (!state) return;
    state->playback_rate = rate;
}

EMSCRIPTEN_KEEPALIVE
void processBufferSourceNode(
    BufferSourceNodeState* state,
    float* output,
    int frame_count,
    float playback_rate,
    float detune
) {
    if (!state || !state->is_active || !state->has_started || !state->buffer_data) {
        memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    // Calculate effective playback rate
    float detune_ratio = std::pow(2.0f, detune / 1200.0f);
    float effective_rate = playback_rate * detune_ratio;

    // Fast path: rate=1.0 and matching channels
    if (effective_rate == 1.0f && state->buffer_channels == state->channels) {
        int frames_written = 0;
        float* out_ptr = output;

        while (frames_written < frame_count) {
            int current_pos = static_cast<int>(state->playback_position);

            // Calculate how many frames we can copy before end/loop point
            int frames_available = state->buffer_length - current_pos;
            int frames_to_copy = std::min(frame_count - frames_written, frames_available);

            if (frames_to_copy > 0) {
                int start_idx = current_pos * state->channels;
                memcpy(out_ptr, state->buffer_data + start_idx, frames_to_copy * state->channels * sizeof(float));
                state->playback_position += frames_to_copy;
                out_ptr += frames_to_copy * state->channels;
                frames_written += frames_to_copy;
            }

            // Check for end/loop
            if (static_cast<int>(state->playback_position) >= state->buffer_length) {
                if (state->loop) {
                    state->playback_position = state->loop_start * state->sample_rate;
                } else {
                    state->is_active = false;
                    // Fill remaining with zeros
                    if (frames_written < frame_count) {
                        memset(out_ptr, 0, (frame_count - frames_written) * state->channels * sizeof(float));
                    }
                    break;
                }
            }
        }
        return;
    }

    // General path with rate change support
    for (int frame = 0; frame < frame_count; ++frame) {
        if (!state->is_active) {
            // Fill remaining with zeros
            memset(output + frame * state->channels, 0, (frame_count - frame) * state->channels * sizeof(float));
            break;
        }

        int pos = static_cast<int>(state->playback_position);
        if (pos >= state->buffer_length) {
            if (state->loop) {
                state->playback_position = state->loop_start * state->sample_rate;
                pos = static_cast<int>(state->playback_position);
            } else {
                state->is_active = false;
                memset(output + frame * state->channels, 0, (frame_count - frame) * state->channels * sizeof(float));
                break;
            }
        }

        // Linear interpolation
        float frac = state->playback_position - pos;
        int next_pos = pos + 1;
        if (next_pos >= state->buffer_length) {
            next_pos = state->loop ? static_cast<int>(state->loop_start * state->sample_rate) : pos;
        }

        // Copy/interpolate samples for each channel
        for (int ch = 0; ch < state->channels; ++ch) {
            int src_ch = (state->buffer_channels == 1) ? 0 : std::min(ch, state->buffer_channels - 1);

            float sample0 = state->buffer_data[pos * state->buffer_channels + src_ch];
            float sample1 = state->buffer_data[next_pos * state->buffer_channels + src_ch];
            float sample = sample0 * (1.0f - frac) + sample1 * frac;

            output[frame * state->channels + ch] = sample;
        }

        state->playback_position += effective_rate;
    }
}

} // extern "C"
