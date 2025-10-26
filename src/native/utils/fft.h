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
	void Forward(const float* input, std::complex<float>* output);

	// Get magnitude spectrum from complex FFT output
	void GetMagnitude(const std::complex<float>* complex_data, float* magnitude, int size);

	// Convert magnitude to decibels
	void MagnitudeToDecibels(const float* magnitude, float* decibels, int size, float min_db, float max_db);

	int GetSize() const { return size_; }

private:
	int size_;
	std::vector<std::complex<float>> twiddle_factors_;

	void ComputeTwiddleFactors();
	void BitReversePermutation(std::complex<float>* data);
};

} // namespace webaudio

#endif // WEBAUDIO_FFT_H
