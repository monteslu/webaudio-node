// AudioParam WASM implementation
// Handles parameter automation for Web Audio API

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cmath>
#include <cstring>
#include <vector>
#include <algorithm>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Automation event types
enum class EventType {
    SET_VALUE = 0,
    LINEAR_RAMP = 1,
    EXPONENTIAL_RAMP = 2,
    SET_TARGET = 3,
    SET_CURVE = 4
};

// Automation event structure
struct AutomationEvent {
    EventType type;
    double time;
    float value;
    double time_constant;  // For SET_TARGET
    double duration;       // For SET_CURVE
    float* curve_values;   // For SET_CURVE
    int curve_length;
};

// AudioParam state
struct AudioParamState {
    float current_value;
    float default_value;
    float min_value;
    float max_value;

    std::vector<AutomationEvent> events;

    // For tracking time
    double last_time;
    float last_computed_value;
};

// Clamp value to min/max range
static inline float ClampValue(float value, float min_val, float max_val) {
    if (value < min_val) return min_val;
    if (value > max_val) return max_val;
    return value;
}

// Create new AudioParam
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

    // Free curve data
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

EMSCRIPTEN_KEEPALIVE
void setParamValueAtTime(AudioParamState* state, float value, double time) {
    if (!state) return;

    AutomationEvent event;
    event.type = EventType::SET_VALUE;
    event.time = time;
    event.value = ClampValue(value, state->min_value, state->max_value);
    event.time_constant = 0.0;
    event.duration = 0.0;
    event.curve_values = nullptr;
    event.curve_length = 0;

    state->events.push_back(event);
}

EMSCRIPTEN_KEEPALIVE
void linearRampToValueAtTime(AudioParamState* state, float value, double time) {
    if (!state) return;

    AutomationEvent event;
    event.type = EventType::LINEAR_RAMP;
    event.time = time;
    event.value = ClampValue(value, state->min_value, state->max_value);
    event.time_constant = 0.0;
    event.duration = 0.0;
    event.curve_values = nullptr;
    event.curve_length = 0;

    state->events.push_back(event);
}

EMSCRIPTEN_KEEPALIVE
void exponentialRampToValueAtTime(AudioParamState* state, float value, double time) {
    if (!state) return;

    AutomationEvent event;
    event.type = EventType::EXPONENTIAL_RAMP;
    event.time = time;
    event.value = ClampValue(value, state->min_value, state->max_value);
    event.time_constant = 0.0;
    event.duration = 0.0;
    event.curve_values = nullptr;
    event.curve_length = 0;

    state->events.push_back(event);
}

EMSCRIPTEN_KEEPALIVE
void setTargetAtTime(AudioParamState* state, float target, double time, double time_constant) {
    if (!state) return;

    AutomationEvent event;
    event.type = EventType::SET_TARGET;
    event.time = time;
    event.value = ClampValue(target, state->min_value, state->max_value);
    event.time_constant = time_constant;
    event.duration = 0.0;
    event.curve_values = nullptr;
    event.curve_length = 0;

    state->events.push_back(event);
}

EMSCRIPTEN_KEEPALIVE
void cancelScheduledParamValues(AudioParamState* state, double cancel_time) {
    if (!state) return;

    // Remove all events after cancel_time
    state->events.erase(
        std::remove_if(state->events.begin(), state->events.end(),
            [cancel_time](const AutomationEvent& e) { return e.time >= cancel_time; }),
        state->events.end()
    );
}

// Get parameter value at specific time (with automation)
EMSCRIPTEN_KEEPALIVE
float getParamValueAtTime(AudioParamState* state, double time, int sample_rate) {
    if (!state || state->events.empty()) {
        return state ? state->current_value : 0.0f;
    }

    // Sort events by time
    std::sort(state->events.begin(), state->events.end(),
        [](const AutomationEvent& a, const AutomationEvent& b) { return a.time < b.time; });

    // Find the active event at this time
    float value = state->current_value;
    AutomationEvent* prev_event = nullptr;

    for (auto& event : state->events) {
        if (event.time > time) {
            break;
        }

        switch (event.type) {
            case EventType::SET_VALUE:
                value = event.value;
                state->last_computed_value = value;
                state->last_time = event.time;
                break;

            case EventType::LINEAR_RAMP:
                if (prev_event) {
                    double t = (time - prev_event->time) / (event.time - prev_event->time);
                    t = std::max(0.0, std::min(1.0, t));
                    value = state->last_computed_value + t * (event.value - state->last_computed_value);
                } else {
                    value = event.value;
                }
                break;

            case EventType::EXPONENTIAL_RAMP:
                if (prev_event && state->last_computed_value > 0.0f && event.value > 0.0f) {
                    double t = (time - prev_event->time) / (event.time - prev_event->time);
                    t = std::max(0.0, std::min(1.0, t));
                    value = state->last_computed_value * std::pow(event.value / state->last_computed_value, t);
                } else {
                    value = event.value;
                }
                break;

            case EventType::SET_TARGET:
                {
                    double elapsed = time - event.time;
                    if (elapsed >= 0.0) {
                        float target = event.value;
                        double tau = event.time_constant;
                        value = target + (state->last_computed_value - target) * std::exp(-elapsed / tau);
                    }
                }
                break;

            case EventType::SET_CURVE:
                // TODO: Implement curve automation
                value = event.value;
                break;
        }

        prev_event = &event;
    }

    return ClampValue(value, state->min_value, state->max_value);
}

} // extern "C"
