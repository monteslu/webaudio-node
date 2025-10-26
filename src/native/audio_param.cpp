#include "audio_param.h"
#include <algorithm>
#include <cmath>

namespace webaudio {

AudioParam::AudioParam(float default_value, float min_value, float max_value)
	: value_(default_value)
	// , default_value_(default_value)  // Removed - unused for now
	, min_value_(min_value)
	, max_value_(max_value) {
}

void AudioParam::SetValue(float value) {
	std::lock_guard<std::mutex> lock(mutex_);
	value_ = ClampValue(value);
}

float AudioParam::GetValue() const {
	std::lock_guard<std::mutex> lock(mutex_);
	return value_;
}

void AudioParam::SetValueAtTime(float value, double time) {
	std::lock_guard<std::mutex> lock(mutex_);
	AutomationEvent event;
	event.type = AutomationEvent::Type::SET_VALUE;
	event.time = time;
	event.value = ClampValue(value);
	event.time_constant = 0.0;
	event.duration = 0.0;
	events_.push_back(event);
	SortEvents();
}

void AudioParam::LinearRampToValueAtTime(float value, double time) {
	std::lock_guard<std::mutex> lock(mutex_);
	AutomationEvent event;
	event.type = AutomationEvent::Type::LINEAR_RAMP;
	event.time = time;
	event.value = ClampValue(value);
	event.time_constant = 0.0;
	event.duration = 0.0;
	events_.push_back(event);
	SortEvents();
}

void AudioParam::ExponentialRampToValueAtTime(float value, double time) {
	std::lock_guard<std::mutex> lock(mutex_);
	AutomationEvent event;
	event.type = AutomationEvent::Type::EXPONENTIAL_RAMP;
	event.time = time;
	event.value = ClampValue(value);
	event.time_constant = 0.0;
	event.duration = 0.0;
	events_.push_back(event);
	SortEvents();
}

void AudioParam::SetTargetAtTime(float target, double time, double time_constant) {
	std::lock_guard<std::mutex> lock(mutex_);
	AutomationEvent event;
	event.type = AutomationEvent::Type::SET_TARGET;
	event.time = time;
	event.value = ClampValue(target);
	event.time_constant = time_constant;
	event.duration = 0.0;
	events_.push_back(event);
	SortEvents();
}

void AudioParam::SetValueCurveAtTime(const std::vector<float>& values, double time, double duration) {
	std::lock_guard<std::mutex> lock(mutex_);

	if (values.empty() || duration <= 0.0) {
		return;
	}

	AutomationEvent event;
	event.type = AutomationEvent::Type::SET_CURVE;
	event.time = time;
	event.value = 0.0f; // Not used for curves
	event.time_constant = 0.0;
	event.duration = duration;
	event.curve_values = values;
	events_.push_back(event);
	SortEvents();
}

void AudioParam::CancelAndHoldAtTime(double cancel_time) {
	std::lock_guard<std::mutex> lock(mutex_);

	// Get the value at the cancel time
	float hold_value = GetValueAtTime(cancel_time, 44100); // Sample rate doesn't matter for this

	// Remove all events at or after cancel_time
	events_.erase(
		std::remove_if(events_.begin(), events_.end(),
			[cancel_time](const AutomationEvent& event) {
				return event.time >= cancel_time;
			}),
		events_.end()
	);

	// Add a SET_VALUE event at cancel_time with the held value
	AutomationEvent hold_event;
	hold_event.type = AutomationEvent::Type::SET_VALUE;
	hold_event.time = cancel_time;
	hold_event.value = hold_value;
	hold_event.time_constant = 0.0;
	hold_event.duration = 0.0;
	events_.push_back(hold_event);
	SortEvents();
}

float AudioParam::GetValueAtTime(double time, int sample_rate) const {
	std::lock_guard<std::mutex> lock(mutex_);

	if (events_.empty()) {
		return value_;
	}

	// Find relevant events
	const AutomationEvent* prev_event = nullptr;
	const AutomationEvent* next_event = nullptr;

	for (const auto& event : events_) {
		if (event.time <= time) {
			prev_event = &event;
		} else {
			next_event = &event;
			break;
		}
	}

	// No events before current time
	if (!prev_event) {
		return value_;
	}

	// Event exactly at current time
	if (prev_event->time == time && prev_event->type == AutomationEvent::Type::SET_VALUE) {
		return prev_event->value;
	}

	// No events after current time
	if (!next_event) {
		return prev_event->value;
	}

	// Handle interpolation based on next event type
	if (next_event->type == AutomationEvent::Type::LINEAR_RAMP) {
		double duration = next_event->time - prev_event->time;
		if (duration <= 0.0) return next_event->value;

		double t = (time - prev_event->time) / duration;
		return prev_event->value + t * (next_event->value - prev_event->value);
	}
	else if (next_event->type == AutomationEvent::Type::EXPONENTIAL_RAMP) {
		double duration = next_event->time - prev_event->time;
		if (duration <= 0.0) return next_event->value;

		double t = (time - prev_event->time) / duration;
		float ratio = next_event->value / prev_event->value;
		return prev_event->value * std::pow(ratio, t);
	}
	else if (prev_event->type == AutomationEvent::Type::SET_TARGET) {
		// Exponential approach to target: v(t) = V1 + (V0 - V1) * exp(-(t - T0) / tau)
		double elapsed = time - prev_event->time;
		float time_constant = prev_event->time_constant;

		if (time_constant <= 0.0) {
			return prev_event->value;
		}

		// Get starting value (from previous event or current value)
		float start_value = value_;
		if (prev_event > &events_.front()) {
			// Find the event before prev_event
			for (size_t i = 0; i < events_.size() - 1; ++i) {
				if (&events_[i + 1] == prev_event) {
					start_value = events_[i].value;
					break;
				}
			}
		}

		return prev_event->value + (start_value - prev_event->value) * std::exp(-elapsed / time_constant);
	}
	else if (prev_event->type == AutomationEvent::Type::SET_CURVE && time < prev_event->time + prev_event->duration) {
		// Curve interpolation
		double elapsed = time - prev_event->time;
		double curve_progress = elapsed / prev_event->duration;

		if (curve_progress < 0.0) curve_progress = 0.0;
		if (curve_progress > 1.0) curve_progress = 1.0;

		// Interpolate within curve array
		size_t curve_size = prev_event->curve_values.size();
		if (curve_size == 0) return value_;
		if (curve_size == 1) return prev_event->curve_values[0];

		double index_float = curve_progress * (curve_size - 1);
		size_t index_1 = static_cast<size_t>(index_float);
		size_t index_2 = std::min(index_1 + 1, curve_size - 1);
		double frac = index_float - index_1;

		return prev_event->curve_values[index_1] + frac * (prev_event->curve_values[index_2] - prev_event->curve_values[index_1]);
	}

	return prev_event->value;
}

void AudioParam::Process(float* output, int frame_count, double current_time, int sample_rate) {
	std::lock_guard<std::mutex> lock(mutex_);

	double sample_time = current_time;
	double time_increment = 1.0 / static_cast<double>(sample_rate);

	// First, compute automation values
	for (int i = 0; i < frame_count; ++i) {
		output[i] = GetValueAtTime(sample_time, sample_rate);
		sample_time += time_increment;
	}

	// Then, add modulation inputs (if any)
	if (has_modulation_) {
		for (int i = 0; i < frame_count; ++i) {
			output[i] = ClampValue(output[i] + modulation_buffer_[i]);
		}
	}
}

void AudioParam::CancelScheduledValues(double cancel_time) {
	std::lock_guard<std::mutex> lock(mutex_);

	events_.erase(
		std::remove_if(events_.begin(), events_.end(),
			[cancel_time](const AutomationEvent& event) {
				return event.time >= cancel_time;
			}),
		events_.end()
	);
}

float AudioParam::ClampValue(float v) const {
	return std::max(min_value_, std::min(max_value_, v));
}

void AudioParam::SortEvents() {
	std::sort(events_.begin(), events_.end(),
		[](const AutomationEvent& a, const AutomationEvent& b) {
			return a.time < b.time;
		}
	);
}

void AudioParam::AddModulationInput(float* input, int frame_count) {
	if (modulation_buffer_.size() < static_cast<size_t>(frame_count)) {
		modulation_buffer_.resize(frame_count, 0.0f);
	}

	// Sum the modulation input
	for (int i = 0; i < frame_count; ++i) {
		modulation_buffer_[i] += input[i];
	}

	has_modulation_ = true;
}

void AudioParam::ClearModulationInputs() {
	if (has_modulation_) {
		std::fill(modulation_buffer_.begin(), modulation_buffer_.end(), 0.0f);
		has_modulation_ = false;
	}
}

} // namespace webaudio
