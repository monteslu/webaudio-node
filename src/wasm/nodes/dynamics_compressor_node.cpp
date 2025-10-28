// DynamicsCompressorNode - Real-time dynamics compression
// Implements attack/release envelope following with knee smoothing

#include <emscripten.h>
#include <cstring>
#include <cmath>

struct DynamicsCompressorNodeState {
    int sample_rate;
    int channels;

    // Parameters
    float threshold;     // dB
    float knee;          // dB
    float ratio;         // N:1
    float attack;        // seconds
    float release;       // seconds

    // State
    float envelope;      // Current gain reduction envelope
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
DynamicsCompressorNodeState* createDynamicsCompressorNode(int sample_rate, int channels) {
    DynamicsCompressorNodeState* state = new DynamicsCompressorNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;

    // Web Audio API defaults
    state->threshold = -24.0f;
    state->knee = 30.0f;
    state->ratio = 12.0f;
    state->attack = 0.003f;
    state->release = 0.25f;
    state->envelope = 0.0f;

    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyDynamicsCompressorNode(DynamicsCompressorNodeState* state) {
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setCompressorThreshold(DynamicsCompressorNodeState* state, float threshold) {
    if (state) state->threshold = threshold;
}

EMSCRIPTEN_KEEPALIVE
void setCompressorKnee(DynamicsCompressorNodeState* state, float knee) {
    if (state) state->knee = knee;
}

EMSCRIPTEN_KEEPALIVE
void setCompressorRatio(DynamicsCompressorNodeState* state, float ratio) {
    if (state) state->ratio = ratio;
}

EMSCRIPTEN_KEEPALIVE
void setCompressorAttack(DynamicsCompressorNodeState* state, float attack) {
    if (state) state->attack = attack;
}

EMSCRIPTEN_KEEPALIVE
void setCompressorRelease(DynamicsCompressorNodeState* state, float release) {
    if (state) state->release = release;
}

// Convert linear to dB
static inline float linearToDb(float linear) {
    return 20.0f * log10f(fmaxf(linear, 1e-6f));
}

// Convert dB to linear
static inline float dbToLinear(float db) {
    return powf(10.0f, db / 20.0f);
}

// Compute gain reduction in dB for given input level
static float computeGainReduction(float input_db, float threshold, float knee, float ratio) {
    if (knee <= 0.0f) {
        // Hard knee
        if (input_db <= threshold) {
            return 0.0f;
        } else {
            return (input_db - threshold) * (1.0f - 1.0f / ratio);
        }
    } else {
        // Soft knee
        float knee_start = threshold - knee / 2.0f;
        float knee_end = threshold + knee / 2.0f;

        if (input_db <= knee_start) {
            return 0.0f;
        } else if (input_db >= knee_end) {
            return (input_db - threshold) * (1.0f - 1.0f / ratio);
        } else {
            // Smooth transition in knee region
            float x = input_db - knee_start;
            float knee_factor = x / knee;
            return knee_factor * knee_factor * (input_db - threshold) * (1.0f - 1.0f / ratio) / 2.0f;
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void processDynamicsCompressorNode(
    DynamicsCompressorNodeState* state,
    float* input,
    float* output,
    int frame_count,
    bool has_input
) {
    if (!state || !has_input) {
        if (output) memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    // Compute envelope time constants
    const float attack_coeff = expf(-1.0f / (state->attack * state->sample_rate));
    const float release_coeff = expf(-1.0f / (state->release * state->sample_rate));

    float envelope = state->envelope;

    for (int i = 0; i < frame_count; i++) {
        // Compute RMS across channels for detection
        float sum_squares = 0.0f;
        for (int ch = 0; ch < state->channels; ch++) {
            float sample = input[i * state->channels + ch];
            sum_squares += sample * sample;
        }
        float rms = sqrtf(sum_squares / state->channels);
        float input_db = linearToDb(rms);

        // Compute desired gain reduction
        float gain_reduction_db = computeGainReduction(
            input_db,
            state->threshold,
            state->knee,
            state->ratio
        );

        // Apply envelope following (attack/release)
        float target = gain_reduction_db;
        if (target > envelope) {
            // Attack (going towards more compression)
            envelope = target + (envelope - target) * attack_coeff;
        } else {
            // Release (going towards less compression)
            envelope = target + (envelope - target) * release_coeff;
        }

        // Convert to linear gain
        float gain = dbToLinear(-envelope);

        // Apply gain to all channels
        for (int ch = 0; ch < state->channels; ch++) {
            output[i * state->channels + ch] = input[i * state->channels + ch] * gain;
        }
    }

    state->envelope = envelope;
}

} // extern "C"
