#include "iir_filter_node.h"
#include <cstring>
#include <cmath>
#include <algorithm>
#include <complex>

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

	// Initialize delay lines for each channel
	int max_delay = std::max(feedforward_.size(), feedback_.size());
	x_history_.resize(channels_);
	y_history_.resize(channels_);

	for (int ch = 0; ch < channels_; ++ch) {
		x_history_[ch].resize(max_delay, 0.0f);
		y_history_[ch].resize(max_delay, 0.0f);
	}
}

void IIRFilterNode::Process(float* output, int frame_count) {
	std::lock_guard<std::mutex> lock(filter_mutex_);

	// Clear output
	ClearBuffer(output, frame_count);

	// Mix all inputs
	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			if (input_buffer_.size() < static_cast<size_t>(frame_count * channels_)) {
				input_buffer_.resize(frame_count * channels_, 0.0f);
			}

			std::memset(input_buffer_.data(), 0, frame_count * channels_ * sizeof(float));
			input_node->Process(input_buffer_.data(), frame_count);
			MixBuffer(output, input_buffer_.data(), frame_count);
		}
	}

	// Apply IIR filter per channel
	int M = feedforward_.size();  // Feedforward order
	int N = feedback_.size();     // Feedback order

	for (int ch = 0; ch < channels_; ++ch) {
		auto& x_hist = x_history_[ch];
		auto& y_hist = y_history_[ch];

		for (int frame = 0; frame < frame_count; ++frame) {
			int idx = frame * channels_ + ch;
			float x_n = output[idx];  // Current input

			// Compute output using Direct Form I:
			// y[n] = b[0]*x[n] + b[1]*x[n-1] + ... + b[M-1]*x[n-M+1]
			//      - a[1]*y[n-1] - a[2]*y[n-2] - ... - a[N-1]*y[n-N+1]

			float y_n = 0.0f;

			// Feedforward (numerator)
			for (int i = 0; i < M; ++i) {
				if (i == 0) {
					y_n += feedforward_[i] * x_n;
				} else if (i < static_cast<int>(x_hist.size())) {
					y_n += feedforward_[i] * x_hist[i - 1];
				}
			}

			// Feedback (denominator), skip a[0] since it's normalized to 1
			for (int i = 1; i < N; ++i) {
				if (i < static_cast<int>(y_hist.size())) {
					y_n -= feedback_[i] * y_hist[i - 1];
				}
			}

			// Update delay lines (shift right)
			for (int i = x_hist.size() - 1; i > 0; --i) {
				x_hist[i] = x_hist[i - 1];
			}
			if (!x_hist.empty()) {
				x_hist[0] = x_n;
			}

			for (int i = y_hist.size() - 1; i > 0; --i) {
				y_hist[i] = y_hist[i - 1];
			}
			if (!y_hist.empty()) {
				y_hist[0] = y_n;
			}

			// Write output
			output[idx] = y_n;
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
