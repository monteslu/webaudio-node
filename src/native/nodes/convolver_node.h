#ifndef WEBAUDIO_CONVOLVER_NODE_H
#define WEBAUDIO_CONVOLVER_NODE_H

#include "audio_node.h"
#include "../utils/fft.h"
#include <vector>
#include <mutex>
#include <complex>
#include <memory>

namespace webaudio {

class ConvolverNode : public AudioNode {
public:
	ConvolverNode(int sample_rate, int channels);
	~ConvolverNode() override = default;

	void Process(float* output, int frame_count, int output_index = 0) override;

	// Set impulse response buffer
	void SetBuffer(const float* data, int length, int num_channels);

	// Normalize property
	void SetNormalize(bool normalize) { normalize_ = normalize; }
	bool GetNormalize() const { return normalize_; }

private:
	std::vector<float> impulse_response_;  // Impulse response (interleaved if stereo)
	std::vector<float> input_history_;     // Circular buffer for input history
	std::vector<float> input_buffer_;      // Temp buffer for processing

	int impulse_length_;
	int impulse_channels_;
	int history_position_;
	bool normalize_;

	std::mutex buffer_mutex_;

	// FFT-based convolution (for long impulse responses)
	static constexpr int FFT_THRESHOLD = 128;  // Use FFT for impulses longer than this
	static constexpr int PARTITION_SIZE = 1024; // Partition size for long impulses
	bool use_fft_;
	int fft_size_;
	int block_size_;
	int num_partitions_;
	std::unique_ptr<FFT> fft_;
	std::vector<std::vector<std::complex<float>>> impulse_fft_partitions_;  // Pre-computed FFT of each partition
	std::vector<std::vector<float>> fdl_;  // Frequency-domain delay line (one per partition)
	int fdl_position_;
	std::vector<float> overlap_buffer_;             // Overlap-add buffer
	std::vector<float> fft_input_buffer_;           // Reusable input buffer
	std::vector<std::complex<float>> fft_temp_;     // Reusable temp buffer
	std::vector<std::complex<float>> input_fft_;    // Reusable FFT output
	std::vector<std::complex<float>> product_;      // Reusable product buffer
	std::vector<float> result_;                     // Reusable IFFT result

	void ProcessDirect(float* __restrict output, const float* __restrict input, int frame_count, int computed_channels);
	void ProcessFFT(float* output, const float* input, int frame_count, int computed_channels);
	void InitializeFFT();
	float ComputeNormalizationScale();
};

} // namespace webaudio

#endif // WEBAUDIO_CONVOLVER_NODE_H
