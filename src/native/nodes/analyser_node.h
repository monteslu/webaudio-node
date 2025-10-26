#ifndef WEBAUDIO_ANALYSER_NODE_H
#define WEBAUDIO_ANALYSER_NODE_H

#include "audio_node.h"
#include "../utils/fft.h"
#include <vector>
#include <complex>
#include <memory>
#include <mutex>

namespace webaudio {

class AnalyserNode : public AudioNode {
public:
	AnalyserNode(int sample_rate, int channels);
	~AnalyserNode() override = default;

	void Process(float* output, int frame_count) override;

	// Configuration
	void SetFFTSize(int size);
	int GetFFTSize() const { return fft_size_; }
	int GetFrequencyBinCount() const { return fft_size_ / 2; }

	void SetMinDecibels(float min_db) { min_decibels_ = min_db; }
	float GetMinDecibels() const { return min_decibels_; }

	void SetMaxDecibels(float max_db) { max_decibels_ = max_db; }
	float GetMaxDecibels() const { return max_decibels_; }

	void SetSmoothingTimeConstant(float smoothing) { smoothing_time_constant_ = smoothing; }
	float GetSmoothingTimeConstant() const { return smoothing_time_constant_; }

	// Data retrieval
	void GetFloatFrequencyData(float* array, int array_size);
	void GetByteFrequencyData(uint8_t* array, int array_size);
	void GetFloatTimeDomainData(float* array, int array_size);
	void GetByteTimeDomainData(uint8_t* array, int array_size);

private:
	int fft_size_;
	float min_decibels_;
	float max_decibels_;
	float smoothing_time_constant_;

	// Circular buffer for time domain data
	std::vector<float> time_buffer_;
	int write_index_;

	// FFT
	std::unique_ptr<FFT> fft_;
	std::vector<std::complex<float>> fft_output_;
	std::vector<float> magnitude_spectrum_;
	std::vector<float> smoothed_spectrum_;

	mutable std::mutex data_mutex_;

	void UpdateFFT();
};

} // namespace webaudio

#endif // WEBAUDIO_ANALYSER_NODE_H
