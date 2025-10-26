#ifndef WEBAUDIO_RESAMPLER_H
#define WEBAUDIO_RESAMPLER_H

#include <vector>

namespace webaudio {

class Resampler {
public:
	Resampler(int source_rate, int dest_rate, int channels);
	~Resampler() = default;

	// Resample audio data
	void Process(const float* input, int input_frames, float* output, int& output_frames);

	// Reset resampler state
	void Reset();

private:
	// int source_rate_;  // Unused - only needed to calculate ratio_
	// int dest_rate_;    // Unused - only needed to calculate ratio_
	int channels_;
	double ratio_;
	double position_;
};

} // namespace webaudio

#endif // WEBAUDIO_RESAMPLER_H
