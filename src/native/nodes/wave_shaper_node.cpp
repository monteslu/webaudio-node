#include "wave_shaper_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

namespace webaudio {

WaveShaperNode::WaveShaperNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, oversample_(Oversample::NONE) {

	is_active_ = true;
}

void WaveShaperNode::SetCurve(const float* curve_data, int curve_length) {
	std::lock_guard<std::mutex> lock(curve_mutex_);
	curve_.assign(curve_data, curve_data + curve_length);
}

void WaveShaperNode::ClearCurve() {
	std::lock_guard<std::mutex> lock(curve_mutex_);
	curve_.clear();
}

float WaveShaperNode::ApplyCurve(float input) const {
	if (curve_.empty()) {
		return input; // Pass through if no curve
	}

	// Clamp input to [-1, 1]
	float clamped_input = std::max(-1.0f, std::min(1.0f, input));

	// Map input from [-1, 1] to curve index [0, curve_length - 1]
	float normalized = (clamped_input + 1.0f) / 2.0f; // [0, 1]
	float index_float = normalized * (curve_.size() - 1);

	// Linear interpolation between curve points
	int index_low = static_cast<int>(std::floor(index_float));
	int index_high = std::min(index_low + 1, static_cast<int>(curve_.size() - 1));
	float frac = index_float - index_low;

	return curve_[index_low] * (1.0f - frac) + curve_[index_high] * frac;
}

void WaveShaperNode::Process(float* output, int frame_count, int output_index) {
	// Cache computed channels to avoid repeated GetChannels() calls
	const int computed_channels = GetChannels();

	// Clear output
	ClearBuffer(output, frame_count, computed_channels);

	// Mix all inputs
	const size_t required_size = frame_count * computed_channels;
	// Pre-size buffer once (avoid repeated checks)
	if (input_buffer_.size() < required_size) {
		input_buffer_.resize(required_size, 0.0f);
	}

	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			input_node->Process(input_buffer_.data(), frame_count);
			MixBuffer(output, input_buffer_.data(), frame_count, computed_channels, 1.0f);
		}
	}

	// Apply waveshaping curve - ultra-optimized with zero-copy pointer access
	// Lock mutex only to get curve pointer and size (avoid copying entire vector!)
	const float* curve_data = nullptr;
	size_t curve_size = 0;
	{
		std::lock_guard<std::mutex> lock(curve_mutex_);
		if (!curve_.empty()) {
			curve_data = curve_.data();
			curve_size = curve_.size();
		}
	}

	if (curve_data && curve_size > 0) {
		// TODO: Add oversampling support for X2 and X4 modes
		// For now, just apply the curve directly (no oversampling)

		// Inline curve application for maximum performance (avoid function call overhead)
		const int total_samples = frame_count * computed_channels;
		const float curve_size_f = static_cast<float>(curve_size);

		// Precompute scaling factor
		const float scale = (curve_size_f - 1.0f) / 2.0f;
		const int curve_size_minus_1 = static_cast<int>(curve_size) - 1;

		// ARM NEON optimization: Process 8 samples at a time for better throughput
#ifdef __ARM_NEON
		const int batch_size = 8;
		const int simd_samples = (total_samples / batch_size) * batch_size;
		const float32x4_t vmin = vdupq_n_f32(-1.0f);
		const float32x4_t vmax = vdupq_n_f32(1.0f);
		const float32x4_t vone = vdupq_n_f32(1.0f);
		const float32x4_t vscale = vdupq_n_f32(scale);

		// SIMD path: clamp and scale 8 samples at once, unrolled curve lookup
		for (int i = 0; i < simd_samples; i += batch_size) {
			// Load and process first 4 samples
			float32x4_t input_vec0 = vld1q_f32(&output[i]);
			input_vec0 = vmaxq_f32(input_vec0, vmin);
			input_vec0 = vminq_f32(input_vec0, vmax);
			float32x4_t index_vec0 = vmulq_f32(vaddq_f32(input_vec0, vone), vscale);

			// Load and process second 4 samples
			float32x4_t input_vec1 = vld1q_f32(&output[i + 4]);
			input_vec1 = vmaxq_f32(input_vec1, vmin);
			input_vec1 = vminq_f32(input_vec1, vmax);
			float32x4_t index_vec1 = vmulq_f32(vaddq_f32(input_vec1, vone), vscale);

			// Store indices for curve lookup
			float index_array[8];
			vst1q_f32(index_array, index_vec0);
			vst1q_f32(index_array + 4, index_vec1);

			// Unrolled scalar curve lookup - process all 8 samples
			float index_float0 = index_array[0];
			int index_low0 = static_cast<int>(index_float0);
			int index_high0 = (index_low0 < curve_size_minus_1) ? (index_low0 + 1) : index_low0;
			float frac0 = index_float0 - index_low0;
			output[i] = curve_data[index_low0] * (1.0f - frac0) + curve_data[index_high0] * frac0;

			float index_float1 = index_array[1];
			int index_low1 = static_cast<int>(index_float1);
			int index_high1 = (index_low1 < curve_size_minus_1) ? (index_low1 + 1) : index_low1;
			float frac1 = index_float1 - index_low1;
			output[i + 1] = curve_data[index_low1] * (1.0f - frac1) + curve_data[index_high1] * frac1;

			float index_float2 = index_array[2];
			int index_low2 = static_cast<int>(index_float2);
			int index_high2 = (index_low2 < curve_size_minus_1) ? (index_low2 + 1) : index_low2;
			float frac2 = index_float2 - index_low2;
			output[i + 2] = curve_data[index_low2] * (1.0f - frac2) + curve_data[index_high2] * frac2;

			float index_float3 = index_array[3];
			int index_low3 = static_cast<int>(index_float3);
			int index_high3 = (index_low3 < curve_size_minus_1) ? (index_low3 + 1) : index_low3;
			float frac3 = index_float3 - index_low3;
			output[i + 3] = curve_data[index_low3] * (1.0f - frac3) + curve_data[index_high3] * frac3;

			float index_float4 = index_array[4];
			int index_low4 = static_cast<int>(index_float4);
			int index_high4 = (index_low4 < curve_size_minus_1) ? (index_low4 + 1) : index_low4;
			float frac4 = index_float4 - index_low4;
			output[i + 4] = curve_data[index_low4] * (1.0f - frac4) + curve_data[index_high4] * frac4;

			float index_float5 = index_array[5];
			int index_low5 = static_cast<int>(index_float5);
			int index_high5 = (index_low5 < curve_size_minus_1) ? (index_low5 + 1) : index_low5;
			float frac5 = index_float5 - index_low5;
			output[i + 5] = curve_data[index_low5] * (1.0f - frac5) + curve_data[index_high5] * frac5;

			float index_float6 = index_array[6];
			int index_low6 = static_cast<int>(index_float6);
			int index_high6 = (index_low6 < curve_size_minus_1) ? (index_low6 + 1) : index_low6;
			float frac6 = index_float6 - index_low6;
			output[i + 6] = curve_data[index_low6] * (1.0f - frac6) + curve_data[index_high6] * frac6;

			float index_float7 = index_array[7];
			int index_low7 = static_cast<int>(index_float7);
			int index_high7 = (index_low7 < curve_size_minus_1) ? (index_low7 + 1) : index_low7;
			float frac7 = index_float7 - index_low7;
			output[i + 7] = curve_data[index_low7] * (1.0f - frac7) + curve_data[index_high7] * frac7;
		}

		// Scalar cleanup for remaining samples
		for (int i = simd_samples; i < total_samples; ++i) {
#else
		// Scalar fallback path
		for (int i = 0; i < total_samples; ++i) {
#endif
			// Clamp input to [-1, 1] with branchless min/max
			float input = output[i];
			input = (input < -1.0f) ? -1.0f : ((input > 1.0f) ? 1.0f : input);

			// Map input from [-1, 1] to curve index [0, curve_size - 1] with single multiply-add
			float index_float = (input + 1.0f) * scale;

			// Linear interpolation between curve points
			int index_low = static_cast<int>(index_float);
			int index_high = (index_low < curve_size_minus_1) ? (index_low + 1) : index_low;
			float frac = index_float - index_low;

			output[i] = curve_data[index_low] * (1.0f - frac) + curve_data[index_high] * frac;
		}
	}
	// If curve is empty, output passes through unchanged
}

} // namespace webaudio
