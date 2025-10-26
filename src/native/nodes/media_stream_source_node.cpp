#include "media_stream_source_node.h"
#include <cstring>
#include <algorithm>

namespace webaudio {

MediaStreamSourceNode::MediaStreamSourceNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, write_pos_(0)
	, read_pos_(0)
	, buffer_size_(sample_rate * channels * 2) {  // 2 seconds of buffer

	is_active_ = true;
	ring_buffer_.resize(buffer_size_, 0.0f);
}

void MediaStreamSourceNode::Process(float* output, int frame_count) {
	int sample_count = frame_count * channels_;

	std::lock_guard<std::mutex> lock(buffer_mutex_);

	// Calculate available samples in ring buffer
	size_t available = (write_pos_ >= read_pos_)
		? (write_pos_ - read_pos_)
		: (buffer_size_ - read_pos_ + write_pos_);

	if (available >= static_cast<size_t>(sample_count)) {
		// Read from ring buffer
		for (int i = 0; i < sample_count; ++i) {
			output[i] = ring_buffer_[read_pos_];
			read_pos_ = (read_pos_ + 1) % buffer_size_;
		}
	} else {
		// Not enough data - output silence
		std::memset(output, 0, sample_count * sizeof(float));
	}
}

void MediaStreamSourceNode::FeedAudioData(const float* data, int frame_count) {
	int sample_count = frame_count * channels_;

	std::lock_guard<std::mutex> lock(buffer_mutex_);

	// Write to ring buffer
	for (int i = 0; i < sample_count; ++i) {
		ring_buffer_[write_pos_] = data[i];
		write_pos_ = (write_pos_ + 1) % buffer_size_;

		// If buffer is full, advance read position (overwrite old data)
		if (write_pos_ == read_pos_) {
			read_pos_ = (read_pos_ + 1) % buffer_size_;
		}
	}
}

bool MediaStreamSourceNode::HasData() const {
	std::lock_guard<std::mutex> lock(buffer_mutex_);
	return write_pos_ != read_pos_;
}

} // namespace webaudio
