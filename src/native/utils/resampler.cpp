#include "resampler.h"
#include <cmath>

namespace webaudio {

Resampler::Resampler(int source_rate, int dest_rate, int channels)
	// : source_rate_(source_rate)  // Removed - only needed to calculate ratio_
	// , dest_rate_(dest_rate)       // Removed - only needed to calculate ratio_
	: channels_(channels)
	, ratio_(static_cast<double>(source_rate) / static_cast<double>(dest_rate))
	, position_(0.0) {
}

void Resampler::Process(const float* input, int input_frames, float* output, int& output_frames) {
	// Simple linear interpolation resampling
	int out_idx = 0;

	for (int i = 0; i < output_frames && position_ < input_frames - 1; ++i) {
		int idx1 = static_cast<int>(position_);
		int idx2 = idx1 + 1;
		double frac = position_ - idx1;

		for (int ch = 0; ch < channels_; ++ch) {
			float sample1 = input[idx1 * channels_ + ch];
			float sample2 = input[idx2 * channels_ + ch];
			output[out_idx * channels_ + ch] = sample1 + frac * (sample2 - sample1);
		}

		out_idx++;
		position_ += ratio_;
	}

	output_frames = out_idx;

	// Wrap position
	position_ -= static_cast<int>(position_);
}

void Resampler::Reset() {
	position_ = 0.0;
}

} // namespace webaudio
