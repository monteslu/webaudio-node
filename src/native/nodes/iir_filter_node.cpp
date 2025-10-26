#include "iir_filter_node.h"
#include <cstring>
#include <cmath>
#include <algorithm>
#include <complex>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

IIRFilterNode::IIRFilterNode(int sample_rate, int channels,
                             const std::vector<float>& feedforward,
                             const std::vector<float>& feedback)
	: AudioNode(sample_rate, channels)
	, feedforward_(feedforward)
	, feedback_(feedback) {

	is_active_ = true;

	// Normalize by a[0]
	if (!feedback_.empty() && feedback_[0] != 0.0f && feedback_[0] != 1.0f) {
		float a0 = feedback_[0];
		for (auto& b : feedforward_) {
			b /= a0;
		}
		for (auto& a : feedback_) {
			a /= a0;
		}
	}

	// Initialize state arrays for Direct Form II Transposed
	// State size is max(M, N) - 1
	int state_size = std::max(feedforward_.size(), feedback_.size()) - 1;
	state_.resize(channels_);
	for (int ch = 0; ch < channels_; ++ch) {
		state_[ch].resize(state_size, 0.0f);
	}
}

void IIRFilterNode::Process(float* output, int frame_count, int output_index) {
	std::lock_guard<std::mutex> lock(filter_mutex_);

	// Cache computed channels to avoid repeated GetChannels() calls
	const int computed_channels = GetChannels();

	// Clear output
	ClearBuffer(output, frame_count, computed_channels);

	// Mix all inputs
	const size_t required_size = frame_count * computed_channels;
	if (input_buffer_.size() < required_size) {
		input_buffer_.resize(required_size, 0.0f);
	}

	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			input_node->Process(input_buffer_.data(), frame_count);
			MixBuffer(output, input_buffer_.data(), frame_count, computed_channels, 1.0f);
		}
	}

	// Apply IIR filter per channel using Direct Form II Transposed
	// This is MUCH faster: better cache locality, no circular buffer overhead
	const int M = feedforward_.size();  // Feedforward order
	const int N = feedback_.size();     // Feedback order
	const int state_size = std::max(M, N) - 1;

	for (int ch = 0; ch < computed_channels; ++ch) {
		float* s = state_[ch].data();  // State array

		// Optimized path for common 5-coefficient (4th order) case
		if (M == 5 && N == 5 && state_size == 4) {
			const float b0 = feedforward_[0];
			const float b1 = feedforward_[1];
			const float b2 = feedforward_[2];
			const float b3 = feedforward_[3];
			const float b4 = feedforward_[4];
			const float a1 = feedback_[1];
			const float a2 = feedback_[2];
			const float a3 = feedback_[3];
			const float a4 = feedback_[4];

			// Cache state values to encourage register allocation
			float s0 = s[0];
			float s1 = s[1];
			float s2 = s[2];
			float s3 = s[3];

			for (int frame = 0; frame < frame_count; ++frame) {
				const int idx = frame * computed_channels + ch;
				const float x = output[idx];

				// Direct Form II Transposed (fully optimized for 4th order)
				const float y = b0 * x + s0;
				const float new_s0 = b1 * x - a1 * y + s1;
				const float new_s1 = b2 * x - a2 * y + s2;
				const float new_s2 = b3 * x - a3 * y + s3;
				const float new_s3 = b4 * x - a4 * y;

				s0 = new_s0;
				s1 = new_s1;
				s2 = new_s2;
				s3 = new_s3;

				output[idx] = y;
			}

			// Write back cached state
			s[0] = s0;
			s[1] = s1;
			s[2] = s2;
			s[3] = s3;
		} else {
			// General case for arbitrary filter orders
			for (int frame = 0; frame < frame_count; ++frame) {
				const int idx = frame * computed_channels + ch;
				const float x = output[idx];

				// Direct Form II Transposed:
				// y[n] = b[0]*x[n] + state[0]
				float y = feedforward_[0] * x + (state_size > 0 ? s[0] : 0.0f);

				// Update states:
				// state[i] = b[i+1]*x[n] - a[i+1]*y[n] + state[i+1]
				for (int i = 0; i < state_size; ++i) {
					float new_state = 0.0f;

					// Feedforward contribution
					if (i + 1 < M) {
						new_state += feedforward_[i + 1] * x;
					}

					// Feedback contribution
					if (i + 1 < N) {
						new_state -= feedback_[i + 1] * y;
					}

					// Next state contribution
					if (i + 1 < state_size) {
						new_state += s[i + 1];
					}

					s[i] = new_state;
				}

				output[idx] = y;
			}
		}
	}
}

void IIRFilterNode::GetFrequencyResponse(const float* frequency_hz, float* mag_response,
                                         float* phase_response, int array_length) const {
	std::lock_guard<std::mutex> lock(filter_mutex_);

	// float nyquist = sample_rate_ / 2.0f;  // TODO: Could validate freq <= nyquist

	for (int i = 0; i < array_length; ++i) {
		float freq = frequency_hz[i];

		// Normalized frequency (omega = 2*pi*f/fs)
		float omega = 2.0f * M_PI * freq / sample_rate_;

		// Compute H(e^jw) = B(e^jw) / A(e^jw)
		// where B and A are polynomials evaluated at e^jw

		std::complex<float> numerator(0.0f, 0.0f);
		std::complex<float> denominator(0.0f, 0.0f);

		// Evaluate numerator (feedforward)
		for (size_t k = 0; k < feedforward_.size(); ++k) {
			float angle = -omega * k;
			numerator += feedforward_[k] * std::complex<float>(std::cos(angle), std::sin(angle));
		}

		// Evaluate denominator (feedback)
		for (size_t k = 0; k < feedback_.size(); ++k) {
			float angle = -omega * k;
			denominator += feedback_[k] * std::complex<float>(std::cos(angle), std::sin(angle));
		}

		// H(e^jw) = numerator / denominator
		std::complex<float> H = numerator / denominator;

		// Magnitude and phase
		mag_response[i] = std::abs(H);
		phase_response[i] = std::arg(H);
	}
}

} // namespace webaudio
