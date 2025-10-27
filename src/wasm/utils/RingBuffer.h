#pragma once

#include <vector>
#include <atomic>
#include <cstring>

// Lock-free ring buffer for audio data
// Single producer (SDL input callback), single consumer (audio graph)
class RingBuffer {
public:
    RingBuffer(size_t capacity)
        : capacity_(capacity),
          buffer_(capacity, 0.0f),
          write_pos_(0),
          read_pos_(0) {
    }

    // Write samples to ring buffer (called from JavaScript/SDL callback)
    // Returns number of samples actually written
    size_t Write(const float* data, size_t count) {
        size_t write_pos = write_pos_.load(std::memory_order_relaxed);
        size_t read_pos = read_pos_.load(std::memory_order_acquire);

        size_t available = GetAvailableWrite(write_pos, read_pos);
        size_t to_write = (count < available) ? count : available;

        if (to_write == 0) {
            return 0; // Buffer full
        }

        // Write in two chunks if wrapping around
        size_t first_chunk = capacity_ - write_pos;
        if (first_chunk >= to_write) {
            // Single contiguous write
            std::memcpy(&buffer_[write_pos], data, to_write * sizeof(float));
        } else {
            // Split write (wrap around)
            std::memcpy(&buffer_[write_pos], data, first_chunk * sizeof(float));
            std::memcpy(&buffer_[0], data + first_chunk, (to_write - first_chunk) * sizeof(float));
        }

        write_pos_.store((write_pos + to_write) % capacity_, std::memory_order_release);
        return to_write;
    }

    // Read samples from ring buffer (called from audio graph render)
    // Returns number of samples actually read (may be less if buffer underrun)
    size_t Read(float* output, size_t count) {
        size_t read_pos = read_pos_.load(std::memory_order_relaxed);
        size_t write_pos = write_pos_.load(std::memory_order_acquire);

        size_t available = GetAvailableRead(read_pos, write_pos);
        size_t to_read = (count < available) ? count : available;

        if (to_read == 0) {
            // Buffer underrun - fill with silence
            std::memset(output, 0, count * sizeof(float));
            return 0;
        }

        // Read in two chunks if wrapping around
        size_t first_chunk = capacity_ - read_pos;
        if (first_chunk >= to_read) {
            // Single contiguous read
            std::memcpy(output, &buffer_[read_pos], to_read * sizeof(float));
        } else {
            // Split read (wrap around)
            std::memcpy(output, &buffer_[read_pos], first_chunk * sizeof(float));
            std::memcpy(output + first_chunk, &buffer_[0], (to_read - first_chunk) * sizeof(float));
        }

        // Fill remainder with silence if underrun
        if (to_read < count) {
            std::memset(output + to_read, 0, (count - to_read) * sizeof(float));
        }

        read_pos_.store((read_pos + to_read) % capacity_, std::memory_order_release);
        return to_read;
    }

    // Get number of samples available to read
    size_t GetAvailable() const {
        size_t read_pos = read_pos_.load(std::memory_order_relaxed);
        size_t write_pos = write_pos_.load(std::memory_order_acquire);
        return GetAvailableRead(read_pos, write_pos);
    }

    // Clear the buffer
    void Clear() {
        write_pos_.store(0, std::memory_order_release);
        read_pos_.store(0, std::memory_order_release);
    }

    size_t GetCapacity() const { return capacity_; }

private:
    size_t GetAvailableRead(size_t read_pos, size_t write_pos) const {
        if (write_pos >= read_pos) {
            return write_pos - read_pos;
        } else {
            return capacity_ - read_pos + write_pos;
        }
    }

    size_t GetAvailableWrite(size_t write_pos, size_t read_pos) const {
        if (read_pos > write_pos) {
            return read_pos - write_pos - 1;
        } else {
            return capacity_ - (write_pos - read_pos) - 1;
        }
    }

    const size_t capacity_;
    std::vector<float> buffer_;
    std::atomic<size_t> write_pos_;
    std::atomic<size_t> read_pos_;
};
