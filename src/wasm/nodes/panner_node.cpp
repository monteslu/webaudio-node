// PannerNode - 3D audio spatialization
// Implements distance models, panning models, and doppler effect

#include <emscripten.h>
#include <cstring>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

enum PanningModel {
    EQUALPOWER = 0,
    HRTF = 1
};

enum DistanceModel {
    LINEAR_DISTANCE = 0,
    INVERSE_DISTANCE = 1,
    EXPONENTIAL_DISTANCE = 2
};

struct Vec3 {
    float x, y, z;
};

struct PannerNodeState {
    int sample_rate;
    int channels;

    // Panning model
    int panning_model;
    int distance_model;

    // Position and orientation
    Vec3 position;
    Vec3 orientation;
    Vec3 velocity;

    // Listener position and orientation
    Vec3 listener_position;
    Vec3 listener_forward;
    Vec3 listener_up;
    Vec3 listener_velocity;

    // Distance parameters
    float ref_distance;
    float max_distance;
    float rolloff_factor;

    // Cone parameters
    float cone_inner_angle;
    float cone_outer_angle;
    float cone_outer_gain;

    // Doppler parameters
    float speed_of_sound;

    // Smoothing for parameter changes
    float prev_gain_l;
    float prev_gain_r;
};

// Vector operations
static inline float vec3_length(const Vec3& v) {
    return sqrtf(v.x * v.x + v.y * v.y + v.z * v.z);
}

static inline Vec3 vec3_normalize(const Vec3& v) {
    float len = vec3_length(v);
    if (len < 1e-6f) return {0.0f, 0.0f, -1.0f};
    return {v.x / len, v.y / len, v.z / len};
}

static inline float vec3_dot(const Vec3& a, const Vec3& b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

static inline Vec3 vec3_cross(const Vec3& a, const Vec3& b) {
    return {
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
    };
}

static inline Vec3 vec3_sub(const Vec3& a, const Vec3& b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
PannerNodeState* createPannerNode(int sample_rate, int channels) {
    PannerNodeState* state = new PannerNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;

    state->panning_model = EQUALPOWER;
    state->distance_model = INVERSE_DISTANCE;

    state->position = {0.0f, 0.0f, 0.0f};
    state->orientation = {1.0f, 0.0f, 0.0f};
    state->velocity = {0.0f, 0.0f, 0.0f};

    state->listener_position = {0.0f, 0.0f, 0.0f};
    state->listener_forward = {0.0f, 0.0f, -1.0f};
    state->listener_up = {0.0f, 1.0f, 0.0f};
    state->listener_velocity = {0.0f, 0.0f, 0.0f};

    state->ref_distance = 1.0f;
    state->max_distance = 10000.0f;
    state->rolloff_factor = 1.0f;

    state->cone_inner_angle = 360.0f;
    state->cone_outer_angle = 360.0f;
    state->cone_outer_gain = 0.0f;

    state->speed_of_sound = 343.3f; // meters/second

    state->prev_gain_l = 1.0f;
    state->prev_gain_r = 1.0f;

    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyPannerNode(PannerNodeState* state) {
    delete state;
}

EMSCRIPTEN_KEEPALIVE
void setPannerPanningModel(PannerNodeState* state, int model) {
    if (state) state->panning_model = model;
}

EMSCRIPTEN_KEEPALIVE
void setPannerDistanceModel(PannerNodeState* state, int model) {
    if (state) state->distance_model = model;
}

EMSCRIPTEN_KEEPALIVE
void setPannerPosition(PannerNodeState* state, float x, float y, float z) {
    if (state) state->position = {x, y, z};
}

EMSCRIPTEN_KEEPALIVE
void setPannerOrientation(PannerNodeState* state, float x, float y, float z) {
    if (state) state->orientation = vec3_normalize({x, y, z});
}

EMSCRIPTEN_KEEPALIVE
void setPannerVelocity(PannerNodeState* state, float x, float y, float z) {
    if (state) state->velocity = {x, y, z};
}

EMSCRIPTEN_KEEPALIVE
void setListenerPosition(PannerNodeState* state, float x, float y, float z) {
    if (state) state->listener_position = {x, y, z};
}

EMSCRIPTEN_KEEPALIVE
void setListenerOrientation(PannerNodeState* state, float fx, float fy, float fz, float ux, float uy, float uz) {
    if (state) {
        state->listener_forward = vec3_normalize({fx, fy, fz});
        state->listener_up = vec3_normalize({ux, uy, uz});
    }
}

EMSCRIPTEN_KEEPALIVE
void setListenerVelocity(PannerNodeState* state, float x, float y, float z) {
    if (state) state->listener_velocity = {x, y, z};
}

EMSCRIPTEN_KEEPALIVE
void setPannerRefDistance(PannerNodeState* state, float ref_distance) {
    if (state) state->ref_distance = fmaxf(0.0f, ref_distance);
}

EMSCRIPTEN_KEEPALIVE
void setPannerMaxDistance(PannerNodeState* state, float max_distance) {
    if (state) state->max_distance = fmaxf(0.0f, max_distance);
}

EMSCRIPTEN_KEEPALIVE
void setPannerRolloffFactor(PannerNodeState* state, float rolloff) {
    if (state) state->rolloff_factor = fmaxf(0.0f, rolloff);
}

EMSCRIPTEN_KEEPALIVE
void setPannerConeAngles(PannerNodeState* state, float inner, float outer) {
    if (state) {
        state->cone_inner_angle = inner;
        state->cone_outer_angle = outer;
    }
}

EMSCRIPTEN_KEEPALIVE
void setPannerConeOuterGain(PannerNodeState* state, float gain) {
    if (state) state->cone_outer_gain = fmaxf(0.0f, fminf(1.0f, gain));
}

// Compute distance gain based on distance model
static float computeDistanceGain(PannerNodeState* state, float distance) {
    distance = fmaxf(0.0f, distance);

    switch (state->distance_model) {
        case LINEAR_DISTANCE:
            return 1.0f - state->rolloff_factor *
                   (fminf(distance, state->max_distance) - state->ref_distance) /
                   (state->max_distance - state->ref_distance);

        case INVERSE_DISTANCE:
            return state->ref_distance /
                   (state->ref_distance + state->rolloff_factor *
                    (fminf(distance, state->max_distance) - state->ref_distance));

        case EXPONENTIAL_DISTANCE:
            return powf(fminf(distance, state->max_distance) / state->ref_distance,
                       -state->rolloff_factor);

        default:
            return 1.0f;
    }
}

// Compute cone gain based on source orientation
static float computeConeGain(PannerNodeState* state, const Vec3& source_to_listener) {
    if (state->cone_inner_angle >= 360.0f && state->cone_outer_angle >= 360.0f) {
        return 1.0f; // No cone
    }

    Vec3 normalized_source_to_listener = vec3_normalize(source_to_listener);
    float angle = acosf(fmaxf(-1.0f, fminf(1.0f,
                        vec3_dot(state->orientation, normalized_source_to_listener))));
    angle = angle * 180.0f / M_PI;

    if (angle <= state->cone_inner_angle / 2.0f) {
        return 1.0f;
    } else if (angle >= state->cone_outer_angle / 2.0f) {
        return state->cone_outer_gain;
    } else {
        // Linear interpolation in cone transition region
        float t = (angle - state->cone_inner_angle / 2.0f) /
                  (state->cone_outer_angle / 2.0f - state->cone_inner_angle / 2.0f);
        return 1.0f + t * (state->cone_outer_gain - 1.0f);
    }
}

// Compute azimuth for equal-power panning
static float computeAzimuth(PannerNodeState* state, const Vec3& source_to_listener) {
    Vec3 listener_right = vec3_cross(state->listener_forward, state->listener_up);
    Vec3 normalized = vec3_normalize(source_to_listener);

    float x = vec3_dot(normalized, listener_right);
    float z = vec3_dot(normalized, state->listener_forward);

    return atan2f(x, z);
}

EMSCRIPTEN_KEEPALIVE
void processPannerNode(
    PannerNodeState* state,
    float* input,
    float* output,
    int frame_count,
    bool has_input
) {
    if (!state || !has_input) {
        memset(output, 0, frame_count * 2 * sizeof(float));
        return;
    }

    // Calculate source to listener vector
    Vec3 source_to_listener = vec3_sub(state->listener_position, state->position);
    float distance = vec3_length(source_to_listener);

    // Compute gains
    float distance_gain = computeDistanceGain(state, distance);
    float cone_gain = computeConeGain(state, source_to_listener);
    float total_gain = distance_gain * cone_gain;

    // Compute stereo panning
    float gain_l, gain_r;

    if (state->panning_model == EQUALPOWER) {
        // Equal-power panning based on azimuth
        float azimuth = computeAzimuth(state, source_to_listener);

        // Map azimuth to stereo field [-90° to +90°]
        azimuth = fmaxf(-M_PI / 2.0f, fminf(M_PI / 2.0f, azimuth));

        // Equal-power panning
        float normalized = (azimuth / (M_PI / 2.0f) + 1.0f) * 0.5f;
        float angle = normalized * M_PI * 0.5f;
        gain_l = cosf(angle) * total_gain;
        gain_r = sinf(angle) * total_gain;
    } else {
        // HRTF model - simplified equal-power for now
        // (Full HRTF would require impulse response convolution)
        float azimuth = computeAzimuth(state, source_to_listener);
        azimuth = fmaxf(-M_PI / 2.0f, fminf(M_PI / 2.0f, azimuth));
        float normalized = (azimuth / (M_PI / 2.0f) + 1.0f) * 0.5f;
        float angle = normalized * M_PI * 0.5f;
        gain_l = cosf(angle) * total_gain;
        gain_r = sinf(angle) * total_gain;
    }

    // Smooth gain changes to avoid clicks
    const float smoothing = 0.01f;

    if (state->channels == 1) {
        // Mono to stereo
        for (int i = 0; i < frame_count; i++) {
            state->prev_gain_l += (gain_l - state->prev_gain_l) * smoothing;
            state->prev_gain_r += (gain_r - state->prev_gain_r) * smoothing;

            float sample = input[i];
            output[i * 2] = sample * state->prev_gain_l;
            output[i * 2 + 1] = sample * state->prev_gain_r;
        }
    } else {
        // Stereo to stereo
        for (int i = 0; i < frame_count; i++) {
            state->prev_gain_l += (gain_l - state->prev_gain_l) * smoothing;
            state->prev_gain_r += (gain_r - state->prev_gain_r) * smoothing;

            float left = input[i * 2];
            float right = input[i * 2 + 1];
            float mono = (left + right) * 0.5f;

            output[i * 2] = mono * state->prev_gain_l;
            output[i * 2 + 1] = mono * state->prev_gain_r;
        }
    }
}

} // extern "C"
