// OscillatorNode WASM implementation
// Generates periodic waveforms: sine, square, sawtooth, triangle

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cmath>
#include <cstring>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Wave types
enum class WaveType {
    SINE = 0,
    SQUARE = 1,
    SAWTOOTH = 2,
    TRIANGLE = 3,
    CUSTOM = 4
};

// OscillatorNode state
struct OscillatorNodeState {
    int sample_rate;
    int channels;
    bool is_active;

    WaveType wave_type;

    double phase;

    // Custom wavetable
    float* custom_wavetable;
    int wavetable_size;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
OscillatorNodeState* createOscillatorNode(
    int sample_rate,
    int channels,
    int wave_type_int
) {
    OscillatorNodeState* state = new OscillatorNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;
    state->is_active = false;  // Oscillator starts stopped
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
void setPeriodicWave(OscillatorNodeState* state, float* wavetable, int size) {
    if (!state) return;

    // Free old wavetable
    if (state->custom_wavetable) {
        delete[] state->custom_wavetable;
    }

    // Allocate and copy new wavetable
    state->custom_wavetable = new float[size];
    memcpy(state->custom_wavetable, wavetable, size * sizeof(float));
    state->wavetable_size = size;
    state->wave_type = WaveType::CUSTOM;
}

// Generate single sample based on wave type
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
                // Linear interpolation from wavetable
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

EMSCRIPTEN_KEEPALIVE
void processOscillatorNode(
    OscillatorNodeState* state,
    float* output,
    int frame_count,
    float frequency,
    float detune
) {
    if (!state) return;

    // If not active, output silence
    if (!state->is_active) {
        memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    // Apply detune (cents to frequency multiplier)
    float detune_multiplier = std::pow(2.0f, detune / 1200.0f);
    float actual_frequency = frequency * detune_multiplier;

    double phase_increment = actual_frequency / static_cast<double>(state->sample_rate);

    // Optimized path for sawtooth (most common, simple math)
    if (state->wave_type == WaveType::SAWTOOTH) {
        for (int frame = 0; frame < frame_count; ++frame) {
            float sample = 2.0f * state->phase - 1.0f;

#ifdef __wasm_simd128__
            // SIMD-optimized channel duplication for 4+ channels
            if (state->channels >= 4) {
                v128_t sample_vec = wasm_f32x4_splat(sample);
                int ch = 0;

                // Write 4 channels at a time
                for (; ch + 4 <= state->channels; ch += 4) {
                    wasm_v128_store(&output[frame * state->channels + ch], sample_vec);
                }

                // Handle remaining channels
                for (; ch < state->channels; ++ch) {
                    output[frame * state->channels + ch] = sample;
                }
            } else
#endif
            {
                // Scalar fallback for < 4 channels
                for (int ch = 0; ch < state->channels; ++ch) {
                    output[frame * state->channels + ch] = sample;
                }
            }

            // Update phase
            state->phase += phase_increment;
            if (state->phase >= 1.0) {
                state->phase -= 1.0;
            }
        }
    } else {
        // General path for other wave types
        for (int frame = 0; frame < frame_count; ++frame) {
            float sample = GenerateSample(state);

#ifdef __wasm_simd128__
            // SIMD-optimized channel duplication
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

            // Update phase
            state->phase += phase_increment;
            if (state->phase >= 1.0) {
                state->phase -= 1.0;
            }
        }
    }
}

} // extern "C"
