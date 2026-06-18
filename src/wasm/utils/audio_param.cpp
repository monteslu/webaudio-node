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

    // Walk the timeline tracking (prevTime, prevValue) = the value just AFTER the
    // last event at or before `time`. Crucially, when `time` falls INSIDE a ramp
    // (i.e. the next event is a ramp ending in the future), interpolate toward it
    // — the previous version broke on the first future event and so only applied
    // ramps AFTER they ended (a step, not a glide).
    float prevValue = state->current_value;
    double prevTime = -1e300;

    for (size_t i = 0; i < state->events.size(); ++i) {
        AutomationEvent& e = state->events[i];

        if (e.time > time) {
            // We're between prevTime and this future event — interpolate if it's a
            // ramp (ramps interpolate from prevValue starting at prevTime).
            if (e.type == EventType::LINEAR_RAMP) {
                double span = e.time - prevTime;
                if (span <= 0) return ClampValue(e.value, state->min_value, state->max_value);
                double t = std::max(0.0, std::min(1.0, (time - prevTime) / span));
                return ClampValue((float)(prevValue + t * (e.value - prevValue)),
                                  state->min_value, state->max_value);
            }
            if (e.type == EventType::EXPONENTIAL_RAMP) {
                double span = e.time - prevTime;
                if (span <= 0 || prevValue <= 0.0f || e.value <= 0.0f)
                    return ClampValue(prevValue, state->min_value, state->max_value);
                double t = std::max(0.0, std::min(1.0, (time - prevTime) / span));
                return ClampValue((float)(prevValue * std::pow((double)e.value / prevValue, t)),
                                  state->min_value, state->max_value);
            }
            // SET_VALUE / SET_CURVE take effect AT their time; before that, hold.
            // SET_TARGET starts AT its time; before that, hold.
            return ClampValue(prevValue, state->min_value, state->max_value);
        }

        // e.time <= time: this event has taken effect; advance (prevTime,prevValue).
        switch (e.type) {
            case EventType::SET_VALUE:
            case EventType::LINEAR_RAMP:
            case EventType::EXPONENTIAL_RAMP:
            case EventType::SET_CURVE:
                prevValue = e.value;
                prevTime = e.time;
                break;
            case EventType::SET_TARGET: {
                double elapsed = time - e.time;
                double tau = e.time_constant > 1e-9 ? e.time_constant : 1e-9;
                prevValue = (float)(e.value + (prevValue - e.value) * std::exp(-elapsed / tau));
                prevTime = time;  // continuous; value already advanced to `time`
                break;
            }
        }
    }

    float value = prevValue;

    return ClampValue(value, state->min_value, state->max_value);
}

} // extern "C"
