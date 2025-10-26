#include "audio_node.h"
#include "../utils/mixer.h"
#include <algorithm>
#include <cstring>
#include <cmath>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

namespace webaudio {

AudioNode::AudioNode(int sample_rate, int channels)
	: sample_rate_(sample_rate)
	, channels_(channels)
	, is_active_(false)
	, current_time_(0.0)
	, cached_channels_(0)
	, channels_cache_valid_(false) {
	// Pre-allocate large enough to avoid ANY resize in hot path (128 frames * 8 channels = max likely size)
	input_buffer_.reserve(1024 * 8);
}

void AudioNode::AddInput(AudioNode* node, int output_index, int input_index) {
	// Add to new connection tracking
	InputConnection conn;
	conn.node = node;
	conn.output_index = output_index;
	conn.input_index = input_index;

	// Check if already exists
	bool found = false;
	for (const auto& existing : input_connections_) {
		if (existing.node == node && existing.output_index == output_index && existing.input_index == input_index) {
			found = true;
			break;
		}
	}

	if (!found) {
		input_connections_.push_back(conn);
	}

	// Also maintain backward-compatible inputs_ list
	if (std::find(inputs_.begin(), inputs_.end(), node) == inputs_.end()) {
		inputs_.push_back(node);
	}

	// Invalidate channel count cache when connections change
	channels_cache_valid_ = false;
}

void AudioNode::AddOutput(AudioNode* node) {
	if (std::find(outputs_.begin(), outputs_.end(), node) == outputs_.end()) {
		outputs_.push_back(node);
	}
}

void AudioNode::RemoveInput(AudioNode* node) {
	inputs_.erase(std::remove(inputs_.begin(), inputs_.end(), node), inputs_.end());
	// Invalidate channel count cache when connections change
	channels_cache_valid_ = false;
}

void AudioNode::RemoveOutput(AudioNode* node) {
	outputs_.erase(std::remove(outputs_.begin(), outputs_.end(), node), outputs_.end());
}

void AudioNode::ClearOutputs() {
	outputs_.clear();
}

void AudioNode::Start(double when) {
	// Default implementation - can be overridden
	is_active_ = true;
}

void AudioNode::Stop(double when) {
	// Default implementation - can be overridden
	is_active_ = false;
}

void AudioNode::SetParameter(const std::string& name, float value) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterValue(const std::string& name, float value, double time) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterRamp(const std::string& name, float value, double time, bool exponential) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterTarget(const std::string& name, float target, double time, double time_constant) {
	// Default implementation - override in derived classes
}

void AudioNode::ScheduleParameterCurve(const std::string& name, const std::vector<float>& values, double time, double duration) {
	// Default implementation - override in derived classes
}

void AudioNode::CancelScheduledParameterValues(const std::string& name, double cancel_time) {
	// Default implementation - override in derived classes
}

void AudioNode::CancelAndHoldParameterAtTime(const std::string& name, double cancel_time, int sample_rate) {
	// Default implementation - override in derived classes
}

int AudioNode::GetChannels() const {
	// Use cached value if valid (CRITICAL performance optimization to avoid O(N^2) recursion)
	if (channels_cache_valid_) {
		return cached_channels_;
	}

	// Per Web Audio spec: compute channel count based on inputs
	// Most nodes use channelCountMode: "max" which means maximum of all input channels

	if (input_connections_.empty()) {
		// No inputs - use the base channel count (channelCount property)
		cached_channels_ = channels_;
		channels_cache_valid_ = true;
		return channels_;
	}

	// Compute max of all input channels (channelCountMode: "max")
	// CRITICAL: Start at 0, not channels_! This allows adapting DOWN to mono.
	int max_channels = 0;
	for (const auto& conn : input_connections_) {
		if (conn.node) {
			// RECURSIVE: Get the computed channels from the input node
			int input_channels = conn.node->GetChannels();
			if (input_channels > max_channels) {
				max_channels = input_channels;
			}
		}
	}

	// Fallback to base channel count if no valid inputs
	cached_channels_ = max_channels > 0 ? max_channels : channels_;
	channels_cache_valid_ = true;
	return cached_channels_;
}

void AudioNode::ClearBuffer(float* buffer, int frame_count) {
	// Use COMPUTED channels, not static channels_!
	int computed_channels = GetChannels();
	std::memset(buffer, 0, frame_count * computed_channels * sizeof(float));
}

// Optimized version with pre-computed channels (avoids recursive GetChannels() call)
void AudioNode::ClearBuffer(float* buffer, int frame_count, int channels) {
	std::memset(buffer, 0, frame_count * channels * sizeof(float));
}

void AudioNode::MixBuffer(float* dest, const float* src, int frame_count, float gain) {
	// Use COMPUTED channels, not static channels_!
	int computed_channels = GetChannels();
	int sample_count = frame_count * computed_channels;
	// Use SIMD-optimized mixer (4-8x faster than scalar loop)
	Mixer::Mix(dest, src, sample_count, gain);
}

// Optimized version with pre-computed channels (avoids recursive GetChannels() call)
void AudioNode::MixBuffer(float* dest, const float* src, int frame_count, int channels, float gain) {
	int sample_count = frame_count * channels;
	// Use SIMD-optimized mixer (4-8x faster than scalar loop)
	Mixer::Mix(dest, src, sample_count, gain);
}

// Version with channel conversion (upmixing/downmixing)
void AudioNode::MixBuffer(float* dest, const float* src, int frame_count, int input_channels, int output_channels, float gain) {
	// Fast path: same channel count
	if (input_channels == output_channels) {
		int sample_count = frame_count * output_channels;
		Mixer::Mix(dest, src, sample_count, gain);
		return;
	}

	// Special case: mono to multi-channel (very common!)
	if (input_channels == 1 && output_channels > 1) {
		// Upmix mono to multi-channel: duplicate mono to all channels
#ifdef __ARM_NEON
		if (output_channels >= 4) {
			// SIMD path: process 4 channels at a time
			for (int frame = 0; frame < frame_count; frame++) {
				float mono_sample = src[frame] * gain;
				float32x4_t sample_vec = vdupq_n_f32(mono_sample);
				float* out = &dest[frame * output_channels];

				// Load existing values, add, and store back
				int ch = 0;
				for (; ch + 4 <= output_channels; ch += 4) {
					float32x4_t existing = vld1q_f32(&out[ch]);
					float32x4_t result = vaddq_f32(existing, sample_vec);
					vst1q_f32(&out[ch], result);
				}

				// Handle remaining channels
				for (; ch < output_channels; ch++) {
					out[ch] += mono_sample;
				}
			}
			return;
		}
#endif
		// Scalar fallback for < 4 channels or non-NEON
		for (int frame = 0; frame < frame_count; frame++) {
			float mono_sample = src[frame] * gain;
			for (int ch = 0; ch < output_channels; ch++) {
				dest[frame * output_channels + ch] += mono_sample;
			}
		}
		return;
	}

	// Special case: stereo to stereo (shouldn't happen with above fast path, but just in case)
	if (input_channels == 2 && output_channels == 2) {
		int sample_count = frame_count * 2;
		Mixer::Mix(dest, src, sample_count, gain);
		return;
	}

	// General channel conversion (less common, can be slower)
	for (int frame = 0; frame < frame_count; frame++) {
		if (input_channels > 1 && output_channels == 1) {
			// Downmix multi-channel to mono: average all input channels
			float sum = 0.0f;
			for (int ch = 0; ch < input_channels; ch++) {
				sum += src[frame * input_channels + ch];
			}
			dest[frame] += (sum / input_channels) * gain;
		}
		else if (input_channels < output_channels) {
			// Upmix: copy available channels, zero the rest
			for (int ch = 0; ch < input_channels; ch++) {
				dest[frame * output_channels + ch] += src[frame * input_channels + ch] * gain;
			}
			// Extra output channels stay zeroed (already cleared by destination)
		}
		else {
			// Downmix: mix down extra input channels (simple average)
			// Copy first output_channels worth
			for (int ch = 0; ch < output_channels; ch++) {
				dest[frame * output_channels + ch] += src[frame * input_channels + ch] * gain;
			}
			// Average in the remaining input channels
			for (int ch = output_channels; ch < input_channels; ch++) {
				int target_ch = ch % output_channels;
				dest[frame * output_channels + target_ch] += src[frame * input_channels + ch] * gain * 0.5f;
			}
		}
	}
}

} // namespace webaudio
