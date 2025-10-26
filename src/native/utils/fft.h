#ifndef WEBAUDIO_FFT_H
#define WEBAUDIO_FFT_H

#include <vector>
#include <complex>

namespace webaudio {

class FFT {
public:
	FFT(int size);
	~FFT() = default;

	// Perform FFT on real input, returns complex frequency domain data
	void Forward(const float* __restrict input, std::complex<float>* __restrict output);

	// Perform inverse FFT on complex data, returns real output
	void Inverse(const std::complex<float>* __restrict input, float* __restrict output);

	// Get magnitude spectrum from complex FFT output
	void GetMagnitude(const std::complex<float>* complex_data, float* magnitude, int size);

	// Convert magnitude to decibels
	void MagnitudeToDecibels(const float* magnitude, float* decibels, int size, float min_db, float max_db);

	int GetSize() const { return size_; }

private:
	int size_;
	int log2_size_;  // Cache log2(size) to avoid recomputing
	std::vector<std::complex<float>> twiddle_factors_;
	std::vector<int> bit_reverse_table_;  // Pre-computed bit reversal indices
	std::vector<std::complex<float>> inverse_temp_;  // Reusable buffer for inverse FFT

	void ComputeTwiddleFactors();
	void ComputeBitReverseTable();
	void BitReversePermutation(std::complex<float>* data);
};

} // namespace webaudio

#endif // WEBAUDIO_FFT_H
