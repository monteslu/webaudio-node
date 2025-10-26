#include "biquad_filter_node.h"
#include <cmath>
#include <cstring>

#if defined(__ARM_NEON__)
#include <arm_neon.h>
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace webaudio {

BiquadFilterNode::BiquadFilterNode(int sample_rate, int channels, const std::string& type)
	: AudioNode(sample_rate, channels)
	, filter_type_(StringToFilterType(type))
	, frequency_param_(std::make_unique<AudioParam>(350.0f, 10.0f, sample_rate / 2.0f))
	, q_param_(std::make_unique<AudioParam>(1.0f, 0.0001f, 1000.0f))
	, gain_param_(std::make_unique<AudioParam>(0.0f, -40.0f, 40.0f))
	, b0_(1.0f), b1_(0.0f), b2_(0.0f), a1_(0.0f), a2_(0.0f)
	, x1_(channels, 0.0f), x2_(channels, 0.0f)
	, y1_(channels, 0.0f), y2_(channels, 0.0f) {

	is_active_ = true;
	input_buffer_.reserve(4096 * channels); // Pre-allocate
	UpdateCoefficients();
}

BiquadFilterNode::FilterType BiquadFilterNode::StringToFilterType(const std::string& type) {
	if (type == "lowpass") return FilterType::LOWPASS;
	if (type == "highpass") return FilterType::HIGHPASS;
	if (type == "bandpass") return FilterType::BANDPASS;
	if (type == "lowshelf") return FilterType::LOWSHELF;
	if (type == "highshelf") return FilterType::HIGHSHELF;
	if (type == "peaking") return FilterType::PEAKING;
	if (type == "notch") return FilterType::NOTCH;
	if (type == "allpass") return FilterType::ALLPASS;
	return FilterType::LOWPASS;
}

void BiquadFilterNode::SetParameter(const std::string& name, float value) {
	if (name == "frequency") {
		frequency_param_->SetValue(value);
		UpdateCoefficients();
	} else if (name == "Q") {
		q_param_->SetValue(value);
		UpdateCoefficients();
	} else if (name == "gain") {
		gain_param_->SetValue(value);
		UpdateCoefficients();
	}
}

void BiquadFilterNode::UpdateCoefficients() {
	float frequency = frequency_param_->GetValue();
	float Q = q_param_->GetValue();
	// float gain = gain_param_->GetValue();  // TODO: Used for peaking, lowshelf, highshelf filters

	// Use float precision - double not needed for audio and slower
	float omega = 2.0f * M_PI * frequency / sample_rate_;
	float sin_omega = std::sin(omega);
	float cos_omega = std::cos(omega);
	float alpha = sin_omega / (2.0f * Q);
	// float A = std::pow(10.0f, gain / 40.0f);  // TODO: Used for peaking, lowshelf, highshelf filters

	float a0 = 1.0f;

	switch (filter_type_) {
		case FilterType::LOWPASS:
			b0_ = (1.0f - cos_omega) / 2.0f;
			b1_ = 1.0f - cos_omega;
			b2_ = (1.0f - cos_omega) / 2.0f;
			a0 = 1.0f + alpha;
			a1_ = -2.0f * cos_omega;
			a2_ = 1.0f - alpha;
			break;

		case FilterType::HIGHPASS:
			b0_ = (1.0f + cos_omega) / 2.0f;
			b1_ = -(1.0f + cos_omega);
			b2_ = (1.0f + cos_omega) / 2.0f;
			a0 = 1.0f + alpha;
			a1_ = -2.0f * cos_omega;
			a2_ = 1.0f - alpha;
			break;

		case FilterType::BANDPASS:
			b0_ = alpha;
			b1_ = 0.0f;
			b2_ = -alpha;
			a0 = 1.0f + alpha;
			a1_ = -2.0f * cos_omega;
			a2_ = 1.0f - alpha;
			break;

		case FilterType::NOTCH:
			b0_ = 1.0f;
			b1_ = -2.0f * cos_omega;
			b2_ = 1.0f;
			a0 = 1.0f + alpha;
			a1_ = -2.0f * cos_omega;
			a2_ = 1.0f - alpha;
			break;

		default:
			// Lowpass as default
			b0_ = (1.0f - cos_omega) / 2.0f;
			b1_ = 1.0f - cos_omega;
			b2_ = (1.0f - cos_omega) / 2.0f;
			a0 = 1.0f + alpha;
			a1_ = -2.0f * cos_omega;
			a2_ = 1.0f - alpha;
			break;
	}

	// Normalize
	b0_ /= a0;
	b1_ /= a0;
	b2_ /= a0;
	a1_ /= a0;
	a2_ /= a0;
}

void BiquadFilterNode::Process(float* output, int frame_count, int output_index) {
	// CRITICAL: Use GetChannels() to get COMPUTED channel count (adapts to mono inputs!)
	const int computed_channels = GetChannels();

	// Optimization: Only clear if no inputs
	if (inputs_.empty()) {
		ClearBuffer(output, frame_count, computed_channels);
		// Still need to process filter on silence to maintain state
	}

	// Fast path: single input (most common case) - process directly
	if (inputs_.size() == 1 && inputs_[0]) {
		inputs_[0]->Process(output, frame_count, output_index);
	} else if (!inputs_.empty()) {
		// Multiple inputs - clear and mix
		ClearBuffer(output, frame_count, computed_channels);

		const size_t required_size = frame_count * computed_channels;
		// Pre-size buffer once (avoid repeated checks)
		if (input_buffer_.size() < required_size) {
			input_buffer_.resize(required_size);
		}

		for (auto* input_node : inputs_) {
			if (input_node) {
				input_node->Process(input_buffer_.data(), frame_count, output_index);
				MixBuffer(output, input_buffer_.data(), frame_count, computed_channels, 1.0f);
			}
		}
	} else {
		// No inputs - clear output
		ClearBuffer(output, frame_count, computed_channels);
	}

	// Ensure state vectors can handle current channel count (only resize if needed)
	const size_t required_state_size = static_cast<size_t>(computed_channels);
	if (x1_.size() < required_state_size) {
		x1_.resize(required_state_size, 0.0f);
		x2_.resize(required_state_size, 0.0f);
		y1_.resize(required_state_size, 0.0f);
		y2_.resize(required_state_size, 0.0f);
	} else if (x1_.size() > required_state_size) {
		// Clear unused channels to avoid stale state
		for (size_t i = required_state_size; i < x1_.size(); ++i) {
			x1_[i] = x2_[i] = y1_[i] = y2_[i] = 0.0f;
		}
	}

	// Apply biquad filter per channel - optimized Direct Form I
	if (computed_channels == 1) {
		// Mono: optimized with loop unrolling matching stereo
		float x1 = x1_[0], x2 = x2_[0], y1 = y1_[0], y2 = y2_[0];
		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;
		float* out = output;

		// Unroll by 4 to match stereo (better for cache and consistency)
		int frame = 0;
		for (; frame + 4 <= frame_count; frame += 4) {
			// Process 4 frames in sequence
			float x0 = out[0];
			float y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
			out[0] = y0;

			float x1_tmp = out[1];
			float y1_tmp = b0 * x1_tmp + b1 * x0 + b2 * x1 - a1 * y0 - a2 * y1;
			out[1] = y1_tmp;

			float x2_tmp = out[2];
			float y2_tmp = b0 * x2_tmp + b1 * x1_tmp + b2 * x0 - a1 * y1_tmp - a2 * y0;
			out[2] = y2_tmp;

			float x3 = out[3];
			float y3 = b0 * x3 + b1 * x2_tmp + b2 * x1_tmp - a1 * y2_tmp - a2 * y1_tmp;
			out[3] = y3;

			// Update state with last two frames
			x2 = x2_tmp; x1 = x3;
			y2 = y2_tmp; y1 = y3;

			out += 4;
		}

		// Process remaining frames
		for (; frame < frame_count; ++frame) {
			const float x0 = *out;
			const float y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
			x2 = x1; x1 = x0;
			y2 = y1; y1 = y0;
			*out++ = y0;
		}

		x1_[0] = x1; x2_[0] = x2; y1_[0] = y1; y2_[0] = y2;
	} else if (computed_channels == 2) {
		// Stereo: cache state in registers with loop unrolling for better ILP
		float x1_L = x1_[0], x2_L = x2_[0], y1_L = y1_[0], y2_L = y2_[0];
		float x1_R = x1_[1], x2_R = x2_[1], y1_R = y1_[1], y2_R = y2_[1];

		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;

		float* out = output;

		// Unroll by 4 for better instruction-level parallelism
		int frame = 0;
		for (; frame + 4 <= frame_count; frame += 4) {
			// Frame 0
			float x_L0 = out[0];
			float x_R0 = out[1];
			float y_L0 = b0 * x_L0 + b1 * x1_L + b2 * x2_L - a1 * y1_L - a2 * y2_L;
			float y_R0 = b0 * x_R0 + b1 * x1_R + b2 * x2_R - a1 * y1_R - a2 * y2_R;

			// Frame 1
			float x_L1 = out[2];
			float x_R1 = out[3];
			float y_L1 = b0 * x_L1 + b1 * x_L0 + b2 * x1_L - a1 * y_L0 - a2 * y1_L;
			float y_R1 = b0 * x_R1 + b1 * x_R0 + b2 * x1_R - a1 * y_R0 - a2 * y1_R;

			// Frame 2
			float x_L2 = out[4];
			float x_R2 = out[5];
			float y_L2 = b0 * x_L2 + b1 * x_L1 + b2 * x_L0 - a1 * y_L1 - a2 * y_L0;
			float y_R2 = b0 * x_R2 + b1 * x_R1 + b2 * x_R0 - a1 * y_R1 - a2 * y_R0;

			// Frame 3
			float x_L3 = out[6];
			float x_R3 = out[7];
			float y_L3 = b0 * x_L3 + b1 * x_L2 + b2 * x_L1 - a1 * y_L2 - a2 * y_L1;
			float y_R3 = b0 * x_R3 + b1 * x_R2 + b2 * x_R1 - a1 * y_R2 - a2 * y_R1;

			// Store results
			out[0] = y_L0; out[1] = y_R0;
			out[2] = y_L1; out[3] = y_R1;
			out[4] = y_L2; out[5] = y_R2;
			out[6] = y_L3; out[7] = y_R3;

			// Update state
			x2_L = x_L2; x1_L = x_L3;
			x2_R = x_R2; x1_R = x_R3;
			y2_L = y_L2; y1_L = y_L3;
			y2_R = y_R2; y1_R = y_R3;

			out += 8;
		}

		// Process remaining frames
		for (; frame < frame_count; ++frame) {
			// Left
			const float x_L = out[0];
			const float y_L = b0 * x_L + b1 * x1_L + b2 * x2_L - a1 * y1_L - a2 * y2_L;
			x2_L = x1_L; x1_L = x_L;
			y2_L = y1_L; y1_L = y_L;
			out[0] = y_L;

			// Right
			const float x_R = out[1];
			const float y_R = b0 * x_R + b1 * x1_R + b2 * x2_R - a1 * y1_R - a2 * y2_R;
			x2_R = x1_R; x1_R = x_R;
			y2_R = y1_R; y1_R = y_R;
			out[1] = y_R;

			out += 2;
		}

		x1_[0] = x1_L; x2_[0] = x2_L; y1_[0] = y1_L; y2_[0] = y2_L;
		x1_[1] = x1_R; x2_[1] = x2_R; y1_[1] = y1_R; y2_[1] = y2_R;
	} else if (computed_channels == 1) {
		// Mono - cache state in registers
		float x1 = x1_[0], x2 = x2_[0], y1 = y1_[0], y2 = y2_[0];
		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;

		float* out = output;
		for (int frame = 0; frame < frame_count; ++frame) {
			const float x0 = *out;
			const float y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
			x2 = x1; x1 = x0;
			y2 = y1; y1 = y0;
			*out++ = y0;
		}

		x1_[0] = x1; x2_[0] = x2; y1_[0] = y1; y2_[0] = y2;
	} else if (computed_channels == 4) {
		// 4-channel SIMD path - process all 4 channels using NEON
#ifdef __ARM_NEON
		const float32x4_t b0_vec = vdupq_n_f32(b0_);
		const float32x4_t b1_vec = vdupq_n_f32(b1_);
		const float32x4_t b2_vec = vdupq_n_f32(b2_);
		const float32x4_t a1_vec = vdupq_n_f32(a1_);
		const float32x4_t a2_vec = vdupq_n_f32(a2_);

		float32x4_t x1_vec = vld1q_f32(x1_.data());
		float32x4_t x2_vec = vld1q_f32(x2_.data());
		float32x4_t y1_vec = vld1q_f32(y1_.data());
		float32x4_t y2_vec = vld1q_f32(y2_.data());

		float* out = output;

		// Unroll by 2 frames for better ILP
		int frame = 0;
		for (; frame + 2 <= frame_count; frame += 2) {
			// Prefetch next iterations to improve cache behavior
			__builtin_prefetch(out + 8, 1, 0);   // Next iteration
			__builtin_prefetch(out + 16, 0, 0);  // Two iterations ahead

			// Frame 0
			float32x4_t x0_vec_0 = vld1q_f32(out);
			float32x4_t y0_vec_0 = vmulq_f32(b0_vec, x0_vec_0);
			y0_vec_0 = vmlaq_f32(y0_vec_0, b1_vec, x1_vec);
			y0_vec_0 = vmlaq_f32(y0_vec_0, b2_vec, x2_vec);
			y0_vec_0 = vmlsq_f32(y0_vec_0, a1_vec, y1_vec);
			y0_vec_0 = vmlsq_f32(y0_vec_0, a2_vec, y2_vec);
			vst1q_f32(out, y0_vec_0);

			// Frame 1
			float32x4_t x0_vec_1 = vld1q_f32(out + 4);
			float32x4_t y0_vec_1 = vmulq_f32(b0_vec, x0_vec_1);
			y0_vec_1 = vmlaq_f32(y0_vec_1, b1_vec, x0_vec_0);
			y0_vec_1 = vmlaq_f32(y0_vec_1, b2_vec, x1_vec);
			y0_vec_1 = vmlsq_f32(y0_vec_1, a1_vec, y0_vec_0);
			y0_vec_1 = vmlsq_f32(y0_vec_1, a2_vec, y1_vec);
			vst1q_f32(out + 4, y0_vec_1);

			// Update state
			x2_vec = x0_vec_0;
			x1_vec = x0_vec_1;
			y2_vec = y0_vec_0;
			y1_vec = y0_vec_1;

			out += 8;
		}

		// Process remaining frames
		for (; frame < frame_count; ++frame) {
			// Load 4 channels
			float32x4_t x0_vec = vld1q_f32(out);

			// y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
			float32x4_t y0_vec = vmulq_f32(b0_vec, x0_vec);
			y0_vec = vmlaq_f32(y0_vec, b1_vec, x1_vec);
			y0_vec = vmlaq_f32(y0_vec, b2_vec, x2_vec);
			y0_vec = vmlsq_f32(y0_vec, a1_vec, y1_vec);
			y0_vec = vmlsq_f32(y0_vec, a2_vec, y2_vec);

			// Update state
			x2_vec = x1_vec;
			x1_vec = x0_vec;
			y2_vec = y1_vec;
			y1_vec = y0_vec;

			// Store result
			vst1q_f32(out, y0_vec);
			out += 4;
		}

		// Write state back
		vst1q_f32(x1_.data(), x1_vec);
		vst1q_f32(x2_.data(), x2_vec);
		vst1q_f32(y1_.data(), y1_vec);
		vst1q_f32(y2_.data(), y2_vec);
#else
		// Scalar fallback
		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;

		float x1[4], x2[4], y1[4], y2[4];
		for (int ch = 0; ch < 4; ++ch) {
			x1[ch] = x1_[ch];
			x2[ch] = x2_[ch];
			y1[ch] = y1_[ch];
			y2[ch] = y2_[ch];
		}

		float* out = output;
		for (int frame = 0; frame < frame_count; ++frame) {
			for (int ch = 0; ch < 4; ++ch) {
				const float x0 = out[ch];
				const float y0 = b0 * x0 + b1 * x1[ch] + b2 * x2[ch] - a1 * y1[ch] - a2 * y2[ch];
				x2[ch] = x1[ch];
				x1[ch] = x0;
				y2[ch] = y1[ch];
				y1[ch] = y0;
				out[ch] = y0;
			}
			out += 4;
		}

		for (int ch = 0; ch < 4; ++ch) {
			x1_[ch] = x1[ch];
			x2_[ch] = x2[ch];
			y1_[ch] = y1[ch];
			y2_[ch] = y2[ch];
		}
#endif
	} else if (computed_channels == 6) {
		// 6-channel: Process first 4 with SIMD, last 2 scalar
#ifdef __ARM_NEON
		const float32x4_t b0_vec = vdupq_n_f32(b0_);
		const float32x4_t b1_vec = vdupq_n_f32(b1_);
		const float32x4_t b2_vec = vdupq_n_f32(b2_);
		const float32x4_t a1_vec = vdupq_n_f32(a1_);
		const float32x4_t a2_vec = vdupq_n_f32(a2_);

		float32x4_t x1_vec = vld1q_f32(x1_.data());
		float32x4_t x2_vec = vld1q_f32(x2_.data());
		float32x4_t y1_vec = vld1q_f32(y1_.data());
		float32x4_t y2_vec = vld1q_f32(y2_.data());

		// Scalar state for channels 4-5
		float x1_4 = x1_[4], x2_4 = x2_[4], y1_4 = y1_[4], y2_4 = y2_[4];
		float x1_5 = x1_[5], x2_5 = x2_[5], y1_5 = y1_[5], y2_5 = y2_[5];
		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;

		float* out = output;

		// Unroll by 2 frames for better ILP
		int frame = 0;
		for (; frame + 2 <= frame_count; frame += 2) {
			// Prefetch next iterations to improve cache behavior
			__builtin_prefetch(out + 12, 1, 0);  // Next iteration (6ch × 2 frames)
			__builtin_prefetch(out + 24, 0, 0);  // Two iterations ahead

			// Frame 0: SIMD channels 0-3
			float32x4_t x0_vec_0 = vld1q_f32(out);
			float32x4_t y0_vec_0 = vmulq_f32(b0_vec, x0_vec_0);
			y0_vec_0 = vmlaq_f32(y0_vec_0, b1_vec, x1_vec);
			y0_vec_0 = vmlaq_f32(y0_vec_0, b2_vec, x2_vec);
			y0_vec_0 = vmlsq_f32(y0_vec_0, a1_vec, y1_vec);
			y0_vec_0 = vmlsq_f32(y0_vec_0, a2_vec, y2_vec);
			vst1q_f32(out, y0_vec_0);

			// Frame 0: Scalar channels 4-5
			float x0_4_f0 = out[4];
			float y0_4_f0 = b0 * x0_4_f0 + b1 * x1_4 + b2 * x2_4 - a1 * y1_4 - a2 * y2_4;
			out[4] = y0_4_f0;

			float x0_5_f0 = out[5];
			float y0_5_f0 = b0 * x0_5_f0 + b1 * x1_5 + b2 * x2_5 - a1 * y1_5 - a2 * y2_5;
			out[5] = y0_5_f0;

			// Frame 1: SIMD channels 0-3
			float32x4_t x0_vec_1 = vld1q_f32(out + 6);
			float32x4_t y0_vec_1 = vmulq_f32(b0_vec, x0_vec_1);
			y0_vec_1 = vmlaq_f32(y0_vec_1, b1_vec, x0_vec_0);
			y0_vec_1 = vmlaq_f32(y0_vec_1, b2_vec, x1_vec);
			y0_vec_1 = vmlsq_f32(y0_vec_1, a1_vec, y0_vec_0);
			y0_vec_1 = vmlsq_f32(y0_vec_1, a2_vec, y1_vec);
			vst1q_f32(out + 6, y0_vec_1);

			// Frame 1: Scalar channels 4-5
			float x0_4_f1 = out[10];
			float y0_4_f1 = b0 * x0_4_f1 + b1 * x0_4_f0 + b2 * x1_4 - a1 * y0_4_f0 - a2 * y1_4;
			out[10] = y0_4_f1;

			float x0_5_f1 = out[11];
			float y0_5_f1 = b0 * x0_5_f1 + b1 * x0_5_f0 + b2 * x1_5 - a1 * y0_5_f0 - a2 * y1_5;
			out[11] = y0_5_f1;

			// Update state
			x2_vec = x0_vec_0; x1_vec = x0_vec_1;
			y2_vec = y0_vec_0; y1_vec = y0_vec_1;
			x2_4 = x0_4_f0; x1_4 = x0_4_f1;
			y2_4 = y0_4_f0; y1_4 = y0_4_f1;
			x2_5 = x0_5_f0; x1_5 = x0_5_f1;
			y2_5 = y0_5_f0; y1_5 = y0_5_f1;

			out += 12;
		}

		// Process remaining frames
		for (; frame < frame_count; ++frame) {
			// Process first 4 channels with SIMD
			float32x4_t x0_vec = vld1q_f32(out);
			float32x4_t y0_vec = vmulq_f32(b0_vec, x0_vec);
			y0_vec = vmlaq_f32(y0_vec, b1_vec, x1_vec);
			y0_vec = vmlaq_f32(y0_vec, b2_vec, x2_vec);
			y0_vec = vmlsq_f32(y0_vec, a1_vec, y1_vec);
			y0_vec = vmlsq_f32(y0_vec, a2_vec, y2_vec);
			x2_vec = x1_vec;
			x1_vec = x0_vec;
			y2_vec = y1_vec;
			y1_vec = y0_vec;
			vst1q_f32(out, y0_vec);

			// Process channels 4-5 scalar
			float x0_4 = out[4];
			float y0_4 = b0 * x0_4 + b1 * x1_4 + b2 * x2_4 - a1 * y1_4 - a2 * y2_4;
			x2_4 = x1_4; x1_4 = x0_4;
			y2_4 = y1_4; y1_4 = y0_4;
			out[4] = y0_4;

			float x0_5 = out[5];
			float y0_5 = b0 * x0_5 + b1 * x1_5 + b2 * x2_5 - a1 * y1_5 - a2 * y2_5;
			x2_5 = x1_5; x1_5 = x0_5;
			y2_5 = y1_5; y1_5 = y0_5;
			out[5] = y0_5;

			out += 6;
		}

		vst1q_f32(x1_.data(), x1_vec);
		vst1q_f32(x2_.data(), x2_vec);
		vst1q_f32(y1_.data(), y1_vec);
		vst1q_f32(y2_.data(), y2_vec);
		x1_[4] = x1_4; x2_[4] = x2_4; y1_[4] = y1_4; y2_[4] = y2_4;
		x1_[5] = x1_5; x2_[5] = x2_5; y1_[5] = y1_5; y2_[5] = y2_5;
#else
		// Scalar fallback for 6ch
		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;
		float x1[6], x2[6], y1[6], y2[6];
		for (int ch = 0; ch < 6; ++ch) {
			x1[ch] = x1_[ch]; x2[ch] = x2_[ch];
			y1[ch] = y1_[ch]; y2[ch] = y2_[ch];
		}
		float* out = output;
		for (int frame = 0; frame < frame_count; ++frame) {
			for (int ch = 0; ch < 6; ++ch) {
				const float x0 = out[ch];
				const float y0 = b0 * x0 + b1 * x1[ch] + b2 * x2[ch] - a1 * y1[ch] - a2 * y2[ch];
				x2[ch] = x1[ch]; x1[ch] = x0;
				y2[ch] = y1[ch]; y1[ch] = y0;
				out[ch] = y0;
			}
			out += 6;
		}
		for (int ch = 0; ch < 6; ++ch) {
			x1_[ch] = x1[ch]; x2_[ch] = x2[ch];
			y1_[ch] = y1[ch]; y2_[ch] = y2[ch];
		}
#endif
	} else if (computed_channels == 8) {
		// 8-channel: Process in two batches of 4 with SIMD + loop unrolling
#ifdef __ARM_NEON
		const float32x4_t b0_vec = vdupq_n_f32(b0_);
		const float32x4_t b1_vec = vdupq_n_f32(b1_);
		const float32x4_t b2_vec = vdupq_n_f32(b2_);
		const float32x4_t a1_vec = vdupq_n_f32(a1_);
		const float32x4_t a2_vec = vdupq_n_f32(a2_);

		float32x4_t x1_vec_0 = vld1q_f32(x1_.data());
		float32x4_t x2_vec_0 = vld1q_f32(x2_.data());
		float32x4_t y1_vec_0 = vld1q_f32(y1_.data());
		float32x4_t y2_vec_0 = vld1q_f32(y2_.data());

		float32x4_t x1_vec_4 = vld1q_f32(x1_.data() + 4);
		float32x4_t x2_vec_4 = vld1q_f32(x2_.data() + 4);
		float32x4_t y1_vec_4 = vld1q_f32(y1_.data() + 4);
		float32x4_t y2_vec_4 = vld1q_f32(y2_.data() + 4);

		float* out = output;

		// Unroll by 4 frames for better ILP and reduced loop overhead
		int frame = 0;
		for (; frame + 4 <= frame_count; frame += 4) {
			// Prefetch next iteration's data to improve cache behavior
			// For 8ch, only prefetch one iteration ahead to avoid cache pollution
			__builtin_prefetch(out + 32, 1, 1);  // Prefetch for write, moderate temporal locality

			// Frame 0: Process channels 0-3
			float32x4_t x0_vec_0 = vld1q_f32(out);
			float32x4_t y0_vec_0 = vmulq_f32(b0_vec, x0_vec_0);
			y0_vec_0 = vmlaq_f32(y0_vec_0, b1_vec, x1_vec_0);
			y0_vec_0 = vmlaq_f32(y0_vec_0, b2_vec, x2_vec_0);
			y0_vec_0 = vmlsq_f32(y0_vec_0, a1_vec, y1_vec_0);
			y0_vec_0 = vmlsq_f32(y0_vec_0, a2_vec, y2_vec_0);
			vst1q_f32(out, y0_vec_0);

			// Frame 0: Process channels 4-7
			float32x4_t x0_vec_4 = vld1q_f32(out + 4);
			float32x4_t y0_vec_4 = vmulq_f32(b0_vec, x0_vec_4);
			y0_vec_4 = vmlaq_f32(y0_vec_4, b1_vec, x1_vec_4);
			y0_vec_4 = vmlaq_f32(y0_vec_4, b2_vec, x2_vec_4);
			y0_vec_4 = vmlsq_f32(y0_vec_4, a1_vec, y1_vec_4);
			y0_vec_4 = vmlsq_f32(y0_vec_4, a2_vec, y2_vec_4);
			vst1q_f32(out + 4, y0_vec_4);

			// Frame 1: Process channels 0-3
			float32x4_t x1_vec_0_tmp = vld1q_f32(out + 8);
			float32x4_t y1_vec_0_tmp = vmulq_f32(b0_vec, x1_vec_0_tmp);
			y1_vec_0_tmp = vmlaq_f32(y1_vec_0_tmp, b1_vec, x0_vec_0);
			y1_vec_0_tmp = vmlaq_f32(y1_vec_0_tmp, b2_vec, x1_vec_0);
			y1_vec_0_tmp = vmlsq_f32(y1_vec_0_tmp, a1_vec, y0_vec_0);
			y1_vec_0_tmp = vmlsq_f32(y1_vec_0_tmp, a2_vec, y1_vec_0);
			vst1q_f32(out + 8, y1_vec_0_tmp);

			// Frame 1: Process channels 4-7
			float32x4_t x1_vec_4_tmp = vld1q_f32(out + 12);
			float32x4_t y1_vec_4_tmp = vmulq_f32(b0_vec, x1_vec_4_tmp);
			y1_vec_4_tmp = vmlaq_f32(y1_vec_4_tmp, b1_vec, x0_vec_4);
			y1_vec_4_tmp = vmlaq_f32(y1_vec_4_tmp, b2_vec, x1_vec_4);
			y1_vec_4_tmp = vmlsq_f32(y1_vec_4_tmp, a1_vec, y0_vec_4);
			y1_vec_4_tmp = vmlsq_f32(y1_vec_4_tmp, a2_vec, y1_vec_4);
			vst1q_f32(out + 12, y1_vec_4_tmp);

			// Frame 2: Process channels 0-3
			float32x4_t x2_vec_0_tmp = vld1q_f32(out + 16);
			float32x4_t y2_vec_0_tmp = vmulq_f32(b0_vec, x2_vec_0_tmp);
			y2_vec_0_tmp = vmlaq_f32(y2_vec_0_tmp, b1_vec, x1_vec_0_tmp);
			y2_vec_0_tmp = vmlaq_f32(y2_vec_0_tmp, b2_vec, x0_vec_0);
			y2_vec_0_tmp = vmlsq_f32(y2_vec_0_tmp, a1_vec, y1_vec_0_tmp);
			y2_vec_0_tmp = vmlsq_f32(y2_vec_0_tmp, a2_vec, y0_vec_0);
			vst1q_f32(out + 16, y2_vec_0_tmp);

			// Frame 2: Process channels 4-7
			float32x4_t x2_vec_4_tmp = vld1q_f32(out + 20);
			float32x4_t y2_vec_4_tmp = vmulq_f32(b0_vec, x2_vec_4_tmp);
			y2_vec_4_tmp = vmlaq_f32(y2_vec_4_tmp, b1_vec, x1_vec_4_tmp);
			y2_vec_4_tmp = vmlaq_f32(y2_vec_4_tmp, b2_vec, x0_vec_4);
			y2_vec_4_tmp = vmlsq_f32(y2_vec_4_tmp, a1_vec, y1_vec_4_tmp);
			y2_vec_4_tmp = vmlsq_f32(y2_vec_4_tmp, a2_vec, y0_vec_4);
			vst1q_f32(out + 20, y2_vec_4_tmp);

			// Frame 3: Process channels 0-3
			float32x4_t x3_vec_0 = vld1q_f32(out + 24);
			float32x4_t y3_vec_0 = vmulq_f32(b0_vec, x3_vec_0);
			y3_vec_0 = vmlaq_f32(y3_vec_0, b1_vec, x2_vec_0_tmp);
			y3_vec_0 = vmlaq_f32(y3_vec_0, b2_vec, x1_vec_0_tmp);
			y3_vec_0 = vmlsq_f32(y3_vec_0, a1_vec, y2_vec_0_tmp);
			y3_vec_0 = vmlsq_f32(y3_vec_0, a2_vec, y1_vec_0_tmp);
			vst1q_f32(out + 24, y3_vec_0);

			// Frame 3: Process channels 4-7
			float32x4_t x3_vec_4 = vld1q_f32(out + 28);
			float32x4_t y3_vec_4 = vmulq_f32(b0_vec, x3_vec_4);
			y3_vec_4 = vmlaq_f32(y3_vec_4, b1_vec, x2_vec_4_tmp);
			y3_vec_4 = vmlaq_f32(y3_vec_4, b2_vec, x1_vec_4_tmp);
			y3_vec_4 = vmlsq_f32(y3_vec_4, a1_vec, y2_vec_4_tmp);
			y3_vec_4 = vmlsq_f32(y3_vec_4, a2_vec, y1_vec_4);
			vst1q_f32(out + 28, y3_vec_4);

			// Update state
			x2_vec_0 = x2_vec_0_tmp; x1_vec_0 = x3_vec_0;
			y2_vec_0 = y2_vec_0_tmp; y1_vec_0 = y3_vec_0;
			x2_vec_4 = x2_vec_4_tmp; x1_vec_4 = x3_vec_4;
			y2_vec_4 = y2_vec_4_tmp; y1_vec_4 = y3_vec_4;

			out += 32;
		}

		// Process remaining frames
		for (; frame < frame_count; ++frame) {
			// Process channels 0-3
			float32x4_t x0_vec = vld1q_f32(out);
			float32x4_t y0_vec = vmulq_f32(b0_vec, x0_vec);
			y0_vec = vmlaq_f32(y0_vec, b1_vec, x1_vec_0);
			y0_vec = vmlaq_f32(y0_vec, b2_vec, x2_vec_0);
			y0_vec = vmlsq_f32(y0_vec, a1_vec, y1_vec_0);
			y0_vec = vmlsq_f32(y0_vec, a2_vec, y2_vec_0);
			x2_vec_0 = x1_vec_0;
			x1_vec_0 = x0_vec;
			y2_vec_0 = y1_vec_0;
			y1_vec_0 = y0_vec;
			vst1q_f32(out, y0_vec);

			// Process channels 4-7
			x0_vec = vld1q_f32(out + 4);
			y0_vec = vmulq_f32(b0_vec, x0_vec);
			y0_vec = vmlaq_f32(y0_vec, b1_vec, x1_vec_4);
			y0_vec = vmlaq_f32(y0_vec, b2_vec, x2_vec_4);
			y0_vec = vmlsq_f32(y0_vec, a1_vec, y1_vec_4);
			y0_vec = vmlsq_f32(y0_vec, a2_vec, y2_vec_4);
			x2_vec_4 = x1_vec_4;
			x1_vec_4 = x0_vec;
			y2_vec_4 = y1_vec_4;
			y1_vec_4 = y0_vec;
			vst1q_f32(out + 4, y0_vec);

			out += 8;
		}

		vst1q_f32(x1_.data(), x1_vec_0);
		vst1q_f32(x2_.data(), x2_vec_0);
		vst1q_f32(y1_.data(), y1_vec_0);
		vst1q_f32(y2_.data(), y2_vec_0);
		vst1q_f32(x1_.data() + 4, x1_vec_4);
		vst1q_f32(x2_.data() + 4, x2_vec_4);
		vst1q_f32(y1_.data() + 4, y1_vec_4);
		vst1q_f32(y2_.data() + 4, y2_vec_4);
#else
		// Scalar fallback for 8ch
		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;
		float x1[8], x2[8], y1[8], y2[8];
		for (int ch = 0; ch < 8; ++ch) {
			x1[ch] = x1_[ch]; x2[ch] = x2_[ch];
			y1[ch] = y1_[ch]; y2[ch] = y2_[ch];
		}
		float* out = output;
		for (int frame = 0; frame < frame_count; ++frame) {
			for (int ch = 0; ch < 8; ++ch) {
				const float x0 = out[ch];
				const float y0 = b0 * x0 + b1 * x1[ch] + b2 * x2[ch] - a1 * y1[ch] - a2 * y2[ch];
				x2[ch] = x1[ch]; x1[ch] = x0;
				y2[ch] = y1[ch]; y1[ch] = y0;
				out[ch] = y0;
			}
			out += 8;
		}
		for (int ch = 0; ch < 8; ++ch) {
			x1_[ch] = x1[ch]; x2_[ch] = x2[ch];
			y1_[ch] = y1[ch]; y2_[ch] = y2[ch];
		}
#endif
	} else {
		// General path for other channel counts
		const float b0 = b0_, b1 = b1_, b2 = b2_, a1 = a1_, a2 = a2_;

		for (int frame = 0; frame < frame_count; ++frame) {
			for (int ch = 0; ch < computed_channels; ++ch) {
				int idx = frame * computed_channels + ch;
				float x0 = output[idx];

				// Biquad difference equation
				float y0 = b0 * x0 + b1 * x1_[ch] + b2 * x2_[ch] - a1 * y1_[ch] - a2 * y2_[ch];

				// Update state
				x2_[ch] = x1_[ch];
				x1_[ch] = x0;
				y2_[ch] = y1_[ch];
				y1_[ch] = y0;

				output[idx] = y0;
			}
		}
	}
}

} // namespace webaudio
