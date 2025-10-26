#include "convolver_node.h"
#include <cstring>
#include <algorithm>
#include <cmath>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

namespace webaudio {

ConvolverNode::ConvolverNode(int sample_rate, int channels)
	: AudioNode(sample_rate, channels)
	, impulse_length_(0)
	, impulse_channels_(0)
	, history_position_(0)
	, normalize_(true)
	, use_fft_(false)
	, fft_size_(0)
	, block_size_(0)
	, num_partitions_(0)
	, fdl_position_(0) {

	is_active_ = true;
}

void ConvolverNode::SetBuffer(const float* data, int length, int num_channels) {
	std::lock_guard<std::mutex> lock(buffer_mutex_);

	impulse_length_ = length;
	impulse_channels_ = num_channels;

	// Copy impulse response
	impulse_response_.resize(length * num_channels);
	std::memcpy(impulse_response_.data(), data, length * num_channels * sizeof(float));

	// Apply normalization if enabled
	if (normalize_) {
		float scale = ComputeNormalizationScale();
		if (scale > 0.0f) {
			for (size_t i = 0; i < impulse_response_.size(); ++i) {
				impulse_response_[i] *= scale;
			}
		}
	}

	// Decide whether to use FFT-based convolution
	use_fft_ = (impulse_length_ > FFT_THRESHOLD);

	if (use_fft_) {
		InitializeFFT();
	} else {
		// Allocate input history buffer for direct convolution
		input_history_.resize(impulse_length_ * channels_, 0.0f);
		history_position_ = 0;
	}
}

float ConvolverNode::ComputeNormalizationScale() {
	if (impulse_response_.empty()) {
		return 1.0f;
	}

	// Find maximum absolute value across all channels
	float max_val = 0.0f;
	for (float sample : impulse_response_) {
		max_val = std::max(max_val, std::abs(sample));
	}

	// Return reciprocal for scaling (avoid division in hot path)
	return (max_val > 0.0f) ? (1.0f / max_val) : 1.0f;
}

void ConvolverNode::InitializeFFT() {
	// Use partitioned convolution for long impulses
	// Break impulse into PARTITION_SIZE chunks, each with its own FFT
	// This keeps FFT size manageable (8192) instead of huge (65536+)

	block_size_ = PARTITION_SIZE;
	fft_size_ = PARTITION_SIZE * 2;  // FFT size = 2 * partition size

	// Calculate number of partitions needed
	num_partitions_ = (impulse_length_ + PARTITION_SIZE - 1) / PARTITION_SIZE;

	// Create FFT object for this size
	fft_ = std::make_unique<FFT>(fft_size_);

	// Pre-allocate all reusable buffers
	fft_input_buffer_.resize(fft_size_, 0.0f);
	fft_temp_.resize(fft_size_);
	input_fft_.resize(fft_size_);
	product_.resize(fft_size_);
	result_.resize(fft_size_);

	// Pre-compute FFT of each partition for each channel
	impulse_fft_partitions_.resize(impulse_channels_);

	for (int ch = 0; ch < impulse_channels_; ++ch) {
		impulse_fft_partitions_[ch].resize(num_partitions_ * fft_size_);

		for (int p = 0; p < num_partitions_; ++p) {
			// Zero-pad and copy this partition
			std::fill(fft_input_buffer_.begin(), fft_input_buffer_.end(), 0.0f);

			int partition_start = p * PARTITION_SIZE;
			int partition_end = std::min(partition_start + PARTITION_SIZE, impulse_length_);

			if (impulse_channels_ == 1) {
				// Mono impulse
				for (int i = partition_start; i < partition_end; ++i) {
					fft_input_buffer_[i - partition_start] = impulse_response_[i];
				}
			} else {
				// Stereo impulse - de-interleave
				for (int i = partition_start; i < partition_end; ++i) {
					fft_input_buffer_[i - partition_start] = impulse_response_[i * 2 + ch];
				}
			}

			// Compute FFT of this partition
			fft_->Forward(fft_input_buffer_.data(), fft_temp_.data());

			// Store FFT for this partition and channel
			for (int i = 0; i < fft_size_; ++i) {
				impulse_fft_partitions_[ch][p * fft_size_ + i] = fft_temp_[i];
			}
		}
	}

	// Allocate frequency-domain delay line (stores past input FFTs)
	fdl_.resize(num_partitions_);
	for (int p = 0; p < num_partitions_; ++p) {
		fdl_[p].resize(fft_size_ * 2, 0.0f);  // Store as interleaved real/imag
	}
	fdl_position_ = 0;

	// Allocate overlap buffer
	overlap_buffer_.resize(PARTITION_SIZE * channels_, 0.0f);
}

void ConvolverNode::ProcessFFT(float* output, const float* input, int frame_count, int computed_channels) {
	// Partitioned convolution: process one block at a time
	// For now, assume frame_count == block_size_ for simplicity
	if (frame_count != block_size_) {
		// Handle partial blocks by zero-padding
		// This is rare in practice
	}

	// Process each output channel
	for (int out_ch = 0; out_ch < computed_channels; ++out_ch) {
		int impulse_ch = (impulse_channels_ == 1) ? 0 : out_ch;

		// 1. Extract input for this channel and zero-pad
		std::fill(fft_input_buffer_.begin(), fft_input_buffer_.end(), 0.0f);
		if (computed_channels == 1) {
			for (int i = 0; i < std::min(frame_count, block_size_); ++i) {
				fft_input_buffer_[i] = input[i];
			}
		} else {
			for (int i = 0; i < std::min(frame_count, block_size_); ++i) {
				fft_input_buffer_[i] = input[i * computed_channels + out_ch];
			}
		}

		// 2. Compute FFT of input block
		fft_->Forward(fft_input_buffer_.data(), input_fft_.data());

		// 3. Store in frequency-domain delay line at current position
		int fdl_idx = fdl_position_;
		for (int i = 0; i < fft_size_; ++i) {
			fdl_[fdl_idx][i * 2] = input_fft_[i].real();
			fdl_[fdl_idx][i * 2 + 1] = input_fft_[i].imag();
		}

		// 4. Convolve with all partitions and accumulate in frequency domain
		// Initialize accumulator to zero
		for (int i = 0; i < fft_size_; ++i) {
			product_[i] = std::complex<float>(0.0f, 0.0f);
		}

		for (int p = 0; p < num_partitions_; ++p) {
			// Get input FFT from delay line (p blocks ago)
			int fdl_read_idx = (fdl_position_ - p + num_partitions_) % num_partitions_;

			// Get impulse partition FFT
			const std::complex<float>* impulse_partition = &impulse_fft_partitions_[impulse_ch][p * fft_size_];

			// Complex multiply and accumulate directly in frequency domain
#ifdef __ARM_NEON
			// SIMD version: Process 2 complex numbers at a time (4 floats)
			const float* __restrict fdl_data = fdl_[fdl_read_idx].data();
			float* __restrict product_data = reinterpret_cast<float*>(product_.data());
			const float* __restrict impulse_data = reinterpret_cast<const float*>(impulse_partition);

			int i = 0;
			for (; i + 1 < fft_size_; i += 2) {
				// Load 2 complex numbers: [r0, i0, r1, i1]
				float32x4_t input_vec = vld1q_f32(&fdl_data[i * 2]);
				float32x4_t impulse_vec = vld1q_f32(&impulse_data[i * 2]);
				float32x4_t product_vec = vld1q_f32(&product_data[i * 2]);

				// Duplicate each component for multiplication
				// input: [r0, i0, r1, i1] -> [r0, r0, r1, r1] and [i0, i0, i1, i1]
				float32x2_t input_low = vget_low_f32(input_vec);   // [r0, i0]
				float32x2_t input_high = vget_high_f32(input_vec); // [r1, i1]
				float32x4_t input_rr = vcombine_f32(vdup_lane_f32(input_low, 0), vdup_lane_f32(input_high, 0));  // [r0, r0, r1, r1]
				float32x4_t input_ii = vcombine_f32(vdup_lane_f32(input_low, 1), vdup_lane_f32(input_high, 1));  // [i0, i0, i1, i1]

				// impulse: [r0, i0, r1, i1] stays as is for first mul, then swap for second
				float32x4_t impulse_swapped = vrev64q_f32(impulse_vec); // [i0, r0, i1, r1]

				// Complex multiply: (a+bi)(c+di) = (ac-bd) + (ad+bc)i
				// First: [r0*r0, r0*i0, r1*r1, r1*i1] - corresponds to r*[r,i]
				// Second: [i0*i0, i0*r0, i1*i1, i1*r1] - corresponds to i*[i,r]
				float32x4_t rr_ri = vmulq_f32(input_rr, impulse_vec);       // [r0*r0, r0*i0, r1*r1, r1*i1]
				float32x4_t ii_ir = vmulq_f32(input_ii, impulse_swapped);   // [i0*i0, i0*r0, i1*i1, i1*r1]

				// Now we need: [r*r - i*i, r*i + i*r, ...]
				// Create sign mask for [-, +, -, +]
				const uint32_t sign_mask_data[4] = {0x80000000, 0x00000000, 0x80000000, 0x00000000};
				float32x4_t sign_mask = vreinterpretq_f32_u32(vld1q_u32(sign_mask_data));

				// Apply sign: rr_ri - [i*i, -i*r, i*i, -i*r] = [r*r - i*i, r*i + i*r, ...]
				float32x4_t ii_ir_signed = vreinterpretq_f32_u32(veorq_u32(
					vreinterpretq_u32_f32(ii_ir),
					vreinterpretq_u32_f32(sign_mask)
				));

				float32x4_t result = vaddq_f32(rr_ri, ii_ir_signed);

				// Accumulate
				product_vec = vaddq_f32(product_vec, result);

				// Store back
				vst1q_f32(&product_data[i * 2], product_vec);
			}

			// Handle remaining element
			for (; i < fft_size_; ++i) {
				std::complex<float> input_val(fdl_data[i * 2], fdl_data[i * 2 + 1]);
				product_[i] += input_val * impulse_partition[i];
			}
#else
			// Scalar version
			for (int i = 0; i < fft_size_; ++i) {
				std::complex<float> input_val(
					fdl_[fdl_read_idx][i * 2],
					fdl_[fdl_read_idx][i * 2 + 1]
				);
				product_[i] += input_val * impulse_partition[i];
			}
#endif
		}

		// 4b. Single inverse FFT for accumulated result
		fft_->Inverse(product_.data(), result_.data());

		// 5. Overlap-add with previous tail
		for (int i = 0; i < frame_count; ++i) {
			float value = result_[i] + overlap_buffer_[i * computed_channels + out_ch];

			if (computed_channels == 1) {
				output[i] += value;
			} else {
				output[i * computed_channels + out_ch] += value;
			}
		}

		// 6. Save tail for next block
		for (int i = 0; i < block_size_; ++i) {
			overlap_buffer_[i * computed_channels + out_ch] = result_[block_size_ + i];
		}
	}

	// Advance FDL position (circular buffer)
	fdl_position_ = (fdl_position_ + 1) % num_partitions_;
}

void ConvolverNode::Process(float* output, int frame_count, int output_index) {
	// CRITICAL: Use GetChannels() for computed channel count
	const int computed_channels = GetChannels();

	// Clear output
	ClearBuffer(output, frame_count, computed_channels);

	if (impulse_length_ == 0 || impulse_response_.empty()) {
		return; // No impulse response set
	}

	// Mix all inputs
	const size_t required_size = frame_count * computed_channels;
	// Pre-size buffer once (avoid repeated checks)
	if (input_buffer_.size() < required_size) {
		input_buffer_.resize(required_size, 0.0f);
	}

	for (auto* input_node : inputs_) {
		if (input_node && input_node->IsActive()) {
			input_node->Process(input_buffer_.data(), frame_count, output_index);

			// Process convolution using FFT or direct method
			if (use_fft_) {
				ProcessFFT(output, input_buffer_.data(), frame_count, computed_channels);
			} else {
				ProcessDirect(output, input_buffer_.data(), frame_count, computed_channels);
			}
		}
	}
}

void ConvolverNode::ProcessDirect(float* __restrict output, const float* __restrict input, int frame_count, int computed_channels) {
	// Lock only for reading impulse parameters, not during processing
	int local_impulse_length;
	int local_impulse_channels;
	{
		std::lock_guard<std::mutex> lock(buffer_mutex_);
		if (impulse_length_ == 0) {
			return;
		}
		local_impulse_length = impulse_length_;
		local_impulse_channels = impulse_channels_;
	}

	// Determine processing mode
	bool mono_impulse = (local_impulse_channels == 1);
	bool stereo_output = (computed_channels == 2);

	// Use restrict pointers for better vectorization
	const float* __restrict impulse = impulse_response_.data();
	float* __restrict history = input_history_.data();

	for (int frame = 0; frame < frame_count; ++frame) {
		// Add current input samples to history
		for (int ch = 0; ch < computed_channels; ++ch) {
			history[history_position_ * computed_channels + ch] = input[frame * computed_channels + ch];
		}

		// Perform convolution for this frame
		if (mono_impulse && !stereo_output) {
			// Mono-to-mono convolution
			float sum = 0.0f;
			int hist_idx = history_position_;

			// Unroll by 4 for better performance
			int i = 0;
			for (; i + 3 < local_impulse_length; i += 4) {
				float h0 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float h1 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float h2 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float h3 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);

				sum += h0 * impulse[i] + h1 * impulse[i+1] + h2 * impulse[i+2] + h3 * impulse[i+3];
			}

			// Handle remainder
			for (; i < local_impulse_length; ++i) {
				sum += history[hist_idx] * impulse[i];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
			}

			output[frame] += sum;

		} else if (mono_impulse && stereo_output) {
			// Mono impulse to stereo output (same convolution for both channels)
			float sum = 0.0f;
			int hist_idx = history_position_;

			// Unroll by 4 for better performance
			int i = 0;
			for (; i + 3 < local_impulse_length; i += 4) {
				float input0 = (history[hist_idx * 2] + history[hist_idx * 2 + 1]) * 0.5f;
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float input1 = (history[hist_idx * 2] + history[hist_idx * 2 + 1]) * 0.5f;
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float input2 = (history[hist_idx * 2] + history[hist_idx * 2 + 1]) * 0.5f;
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float input3 = (history[hist_idx * 2] + history[hist_idx * 2 + 1]) * 0.5f;
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);

				sum += input0 * impulse[i] + input1 * impulse[i+1] + input2 * impulse[i+2] + input3 * impulse[i+3];
			}

			// Handle remainder
			for (; i < local_impulse_length; ++i) {
				float input_sample = (history[hist_idx * 2] + history[hist_idx * 2 + 1]) * 0.5f;
				sum += input_sample * impulse[i];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
			}

			output[frame * 2] += sum;
			output[frame * 2 + 1] += sum;

		} else if (!mono_impulse && stereo_output) {
			// Stereo-to-stereo convolution
			float sum_left = 0.0f;
			float sum_right = 0.0f;
			int hist_idx = history_position_;

			// Unroll by 2 for stereo processing
			int i = 0;
			for (; i + 1 < local_impulse_length; i += 2) {
				float input_left0 = history[hist_idx * 2];
				float input_right0 = history[hist_idx * 2 + 1];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);

				float input_left1 = history[hist_idx * 2];
				float input_right1 = history[hist_idx * 2 + 1];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);

				sum_left += input_left0 * impulse[i * 2] + input_right0 * impulse[i * 2 + 1] +
				           input_left1 * impulse[(i+1) * 2] + input_right1 * impulse[(i+1) * 2 + 1];
				sum_right += input_left0 * impulse[i * 2 + 1] + input_right0 * impulse[i * 2] +
				            input_left1 * impulse[(i+1) * 2 + 1] + input_right1 * impulse[(i+1) * 2];
			}

			// Handle remainder
			for (; i < local_impulse_length; ++i) {
				float input_left = history[hist_idx * 2];
				float input_right = history[hist_idx * 2 + 1];

				sum_left += input_left * impulse[i * 2] + input_right * impulse[i * 2 + 1];
				sum_right += input_left * impulse[i * 2 + 1] + input_right * impulse[i * 2];

				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
			}

			output[frame * 2] += sum_left;
			output[frame * 2 + 1] += sum_right;

		} else {
			// Stereo impulse to mono output - downmix
			float sum = 0.0f;
			int hist_idx = history_position_;

			// Unroll by 4 for better performance
			int i = 0;
			for (; i + 3 < local_impulse_length; i += 4) {
				float h0 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float h1 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float h2 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
				float h3 = history[hist_idx];
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);

				float avg0 = (impulse[i * 2] + impulse[i * 2 + 1]) * 0.5f;
				float avg1 = (impulse[(i+1) * 2] + impulse[(i+1) * 2 + 1]) * 0.5f;
				float avg2 = (impulse[(i+2) * 2] + impulse[(i+2) * 2 + 1]) * 0.5f;
				float avg3 = (impulse[(i+3) * 2] + impulse[(i+3) * 2 + 1]) * 0.5f;

				sum += h0 * avg0 + h1 * avg1 + h2 * avg2 + h3 * avg3;
			}

			// Handle remainder
			for (; i < local_impulse_length; ++i) {
				float avg_impulse = (impulse[i * 2] + impulse[i * 2 + 1]) * 0.5f;
				sum += history[hist_idx] * avg_impulse;
				hist_idx = (hist_idx == 0) ? (local_impulse_length - 1) : (hist_idx - 1);
			}

			output[frame] += sum;
		}

		// Advance history position
		history_position_ = (history_position_ + 1) % local_impulse_length;
	}
}

} // namespace webaudio
