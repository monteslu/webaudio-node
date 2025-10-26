#include "buffer_source_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>
#include <iostream>

namespace webaudio {

BufferSourceNode::BufferSourceNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, buffer_length_(0)
	, buffer_channels_(0)
	, playback_position_(0.0)
	, using_shared_buffer_(false)
	, loop_(false)
	, playback_rate_(1.0f)
	, loop_start_(0.0)
	, loop_end_(0.0)
	, detune_param_(std::make_unique<AudioParam>(0.0f, -1200.0f, 1200.0f))
	, has_started_(false)
	, has_stopped_(false)
	, scheduled_start_time_(-1.0)
	// , scheduled_stop_time_(-1.0)  // TODO: Implement stop(when) timing
	, playback_offset_(0.0)
	// , playback_duration_(0.0)  // TODO: Implement start(when, offset, duration)
	{
}

void BufferSourceNode::SetBuffer(float* data, int length, int num_channels) {
	buffer_length_ = length;
	buffer_channels_ = num_channels;
	buffer_data_.resize(length * num_channels);
	std::memcpy(buffer_data_.data(), data, length * num_channels * sizeof(float));
	playback_position_ = 0;
	using_shared_buffer_ = false;
}

void BufferSourceNode::SetSharedBuffer(std::shared_ptr<std::vector<float>> data, int length, int num_channels) {
	shared_buffer_data_ = data;
	buffer_length_ = length;
	buffer_channels_ = num_channels;
	playback_position_ = 0;
	using_shared_buffer_ = true;
}

void BufferSourceNode::Start(double when) {
	scheduled_start_time_ = when;
	has_started_ = false;  // Will be set to true when current_time >= scheduled_start_time_
	has_stopped_ = false;
	playback_position_ = playback_offset_ * sample_rate_;
	// Note: is_active_ will be set to true when playback actually starts
}

void BufferSourceNode::Stop(double when) {
	has_stopped_ = true;
	is_active_ = false;
}

void BufferSourceNode::SetParameter(const std::string& name, float value) {
	if (name == "loop") {
		loop_ = (value > 0.5f);
	} else if (name == "playbackRate") {
		playback_rate_ = value;
	} else if (name == "loopStart") {
		loop_start_ = value;
	} else if (name == "loopEnd") {
		loop_end_ = value;
	} else if (name == "detune") {
		detune_param_->SetValue(value);
	}
}

void BufferSourceNode::Process(float* output, int frame_count) {
	// Check if we should start playing
	if (!has_started_ && scheduled_start_time_ >= 0.0 && current_time_ >= scheduled_start_time_) {
		has_started_ = true;
		is_active_ = true;
	}

	// Check if we have buffer data
	bool has_data = using_shared_buffer_ ? (shared_buffer_data_ && !shared_buffer_data_->empty()) : !buffer_data_.empty();

	if (!is_active_ || !has_started_ || has_stopped_ || !has_data) {
		ClearBuffer(output, frame_count);
		return;
	}

	ClearBuffer(output, frame_count);

	// Get pointer to the correct buffer data
	const float* buffer_ptr = using_shared_buffer_ ? shared_buffer_data_->data() : buffer_data_.data();

	// Calculate effective playback rate (including detune)
	// detune is in cents: 100 cents = 1 semitone, 1200 cents = 1 octave
	float detune = detune_param_->GetValue();
	float detune_ratio = std::pow(2.0f, detune / 1200.0f);
	float effective_rate = playback_rate_ * detune_ratio;

	// Convert loop times from seconds to sample positions
	int loop_start_samples = static_cast<int>(loop_start_ * sample_rate_);
	int loop_end_samples = loop_end_ > 0.0
		? static_cast<int>(loop_end_ * sample_rate_)
		: buffer_length_;

	// Clamp loop points to buffer bounds
	loop_start_samples = std::max(0, std::min(loop_start_samples, buffer_length_ - 1));
	loop_end_samples = std::max(loop_start_samples + 1, std::min(loop_end_samples, buffer_length_));

	for (int frame = 0; frame < frame_count; ++frame) {
		int current_pos = static_cast<int>(playback_position_);

		// Check if we've reached the end
		if (current_pos >= buffer_length_) {
			if (loop_) {
				playback_position_ = loop_start_samples;
				current_pos = loop_start_samples;
			} else {
				is_active_ = false;
				break;
			}
		}

		// Check if we've passed the loop end point
		if (loop_ && current_pos >= loop_end_samples) {
			playback_position_ = loop_start_samples;
			current_pos = loop_start_samples;
		}

		// Simple playback (no interpolation for now)
		int buffer_idx = current_pos * buffer_channels_;

		if (buffer_channels_ == channels_) {
			// Same channel count - direct copy
			for (int ch = 0; ch < channels_; ++ch) {
				output[frame * channels_ + ch] = buffer_ptr[buffer_idx + ch];
			}
		} else if (buffer_channels_ == 1 && channels_ == 2) {
			// Mono to stereo
			float sample = buffer_ptr[buffer_idx];
			output[frame * channels_ + 0] = sample;
			output[frame * channels_ + 1] = sample;
		} else if (buffer_channels_ == 2 && channels_ == 1) {
			// Stereo to mono (mix down)
			float sample = (buffer_ptr[buffer_idx + 0] + buffer_ptr[buffer_idx + 1]) * 0.5f;
			output[frame * channels_] = sample;
		}

		playback_position_ += effective_rate;
	}
}

AudioParam* BufferSourceNode::GetAudioParam(const std::string& name) {
	if (name == "detune") {
		return detune_param_.get();
	}
	return nullptr;
}

} // namespace webaudio
