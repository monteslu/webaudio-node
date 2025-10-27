// Audio format decoders using dr_libs and stb
// Public domain single-header audio decoders

#define DR_MP3_IMPLEMENTATION
#include "../vendor/dr_mp3.h"

#define DR_WAV_IMPLEMENTATION
#include "../vendor/dr_wav.h"

#define DR_FLAC_IMPLEMENTATION
#include "../vendor/dr_flac.h"

#include "../vendor/stb_vorbis.c"

// Speex resampler (BSD license)
#define OUTSIDE_SPEEX
#define RANDOM_PREFIX webaudio
#define FLOATING_POINT  // Use floating point (not fixed point)
#define EXPORT
#include "../vendor/resample.c"

// Stub out POSIX file I/O functions for uaac.h MP4 parsing (which we don't use)
// These are only needed for compilation; they won't be called since we decode raw AAC data
extern "C" {
    ssize_t read(int fd, void *buf, size_t count) { return -1; }
    off_t lseek(int fd, off_t offset, int whence) { return -1; }
}

#include "../vendor/uaac.h"

#include <emscripten.h>
#include <cstdlib>
#include <cstring>
#include <vector>

extern "C" {

// Decode MP3 file to interleaved float samples
// Returns: number of channels (1 or 2), or -1 on error
// Output format: interleaved float32 samples [L, R, L, R, ...]
EMSCRIPTEN_KEEPALIVE
int decodeMP3(const uint8_t* input, size_t inputSize, float** output, size_t* totalSamples, int* sampleRate) {
    drmp3 mp3;

    if (!drmp3_init_memory(&mp3, input, inputSize, NULL)) {
        return -1;
    }

    // Get total frame count and allocate output buffer
    drmp3_uint64 totalFrames = drmp3_get_pcm_frame_count(&mp3);
    int channels = mp3.channels;
    *sampleRate = mp3.sampleRate;
    *totalSamples = totalFrames * channels;

    // Allocate output buffer (caller must free)
    *output = (float*)malloc(*totalSamples * sizeof(float));
    if (!*output) {
        drmp3_uninit(&mp3);
        return -1;
    }

    // Decode all frames at once
    drmp3_uint64 framesRead = drmp3_read_pcm_frames_f32(&mp3, totalFrames, *output);

    drmp3_uninit(&mp3);

    if (framesRead != totalFrames) {
        free(*output);
        return -1;
    }

    return channels;
}

// Decode WAV file to interleaved float samples
// Returns: number of channels (1 or 2), or -1 on error
// Output format: interleaved float32 samples [L, R, L, R, ...]
EMSCRIPTEN_KEEPALIVE
int decodeWAV(const uint8_t* input, size_t inputSize, float** output, size_t* totalSamples, int* sampleRate) {
    drwav wav;

    if (!drwav_init_memory(&wav, input, inputSize, NULL)) {
        return -1;
    }

    int channels = wav.channels;
    *sampleRate = wav.sampleRate;
    drwav_uint64 totalFrames = wav.totalPCMFrameCount;
    *totalSamples = totalFrames * channels;

    // Allocate output buffer (caller must free)
    *output = (float*)malloc(*totalSamples * sizeof(float));
    if (!*output) {
        drwav_uninit(&wav);
        return -1;
    }

    // Decode all frames at once
    drwav_uint64 framesRead = drwav_read_pcm_frames_f32(&wav, totalFrames, *output);

    drwav_uninit(&wav);

    if (framesRead != totalFrames) {
        free(*output);
        return -1;
    }

    return channels;
}

// Decode FLAC file to interleaved float samples
// Returns: number of channels, or -1 on error
// Output format: interleaved float32 samples [L, R, L, R, ...]
EMSCRIPTEN_KEEPALIVE
int decodeFLAC(const uint8_t* input, size_t inputSize, float** output, size_t* totalSamples, int* sampleRate) {
    drflac* flac = drflac_open_memory(input, inputSize, NULL);

    if (!flac) {
        return -1;
    }

    int channels = flac->channels;
    *sampleRate = flac->sampleRate;
    drflac_uint64 totalFrames = flac->totalPCMFrameCount;
    *totalSamples = totalFrames * channels;

    // Allocate output buffer (caller must free)
    *output = (float*)malloc(*totalSamples * sizeof(float));
    if (!*output) {
        drflac_close(flac);
        return -1;
    }

    // Decode all frames at once
    drflac_uint64 framesRead = drflac_read_pcm_frames_f32(flac, totalFrames, *output);

    drflac_close(flac);

    if (framesRead != totalFrames) {
        free(*output);
        return -1;
    }

    return channels;
}

// Decode Vorbis/OGG file to interleaved float samples
// Returns: number of channels, or -1 on error
// Output format: interleaved float32 samples [L, R, L, R, ...]
EMSCRIPTEN_KEEPALIVE
int decodeVorbis(const uint8_t* input, size_t inputSize, float** output, size_t* totalSamples, int* sampleRate) {
    int error = 0;
    stb_vorbis* vorbis = stb_vorbis_open_memory(input, inputSize, &error, NULL);

    if (!vorbis || error != 0) {
        return -1;
    }

    stb_vorbis_info info = stb_vorbis_get_info(vorbis);
    int channels = info.channels;
    *sampleRate = info.sample_rate;

    // Get total sample count
    int totalFrames = stb_vorbis_stream_length_in_samples(vorbis);
    *totalSamples = totalFrames * channels;

    // Allocate output buffer (caller must free)
    *output = (float*)malloc(*totalSamples * sizeof(float));
    if (!*output) {
        stb_vorbis_close(vorbis);
        return -1;
    }

    // stb_vorbis returns samples per channel, need to interleave
    // Allocate temp buffer for planar data
    float** channelData = (float**)malloc(channels * sizeof(float*));
    for (int i = 0; i < channels; i++) {
        channelData[i] = (float*)malloc(totalFrames * sizeof(float));
    }

    // Decode all samples
    int samplesRead = 0;
    int offset = 0;
    while (offset < totalFrames) {
        int n = stb_vorbis_get_samples_float(vorbis, channels, channelData, totalFrames - offset);
        if (n == 0) break;

        // Interleave samples
        for (int frame = 0; frame < n; frame++) {
            for (int ch = 0; ch < channels; ch++) {
                (*output)[(offset + frame) * channels + ch] = channelData[ch][frame];
            }
        }
        offset += n;
        samplesRead += n;
    }

    // Free temp buffers
    for (int i = 0; i < channels; i++) {
        free(channelData[i]);
    }
    free(channelData);

    stb_vorbis_close(vorbis);

    if (samplesRead != totalFrames) {
        free(*output);
        return -1;
    }

    return channels;
}

// Decode AAC file to interleaved float samples
// Returns: number of channels, or -1 on error
// Output format: interleaved float32 samples [L, R, L, R, ...]
EMSCRIPTEN_KEEPALIVE
int decodeAAC(const uint8_t* input, size_t inputSize, float** output, size_t* totalSamples, int* sampleRate) {
    HAACDecoder decoder = AACInitDecoder();
    if (!decoder) {
        return -1;
    }

    // Make a mutable copy of input data
    uint8_t* inputCopy = (uint8_t*)malloc(inputSize);
    if (!inputCopy) {
        AACFreeDecoder(decoder);
        return -1;
    }
    memcpy(inputCopy, input, inputSize);

    uint8_t* inputPtr = inputCopy;
    int bytesLeft = inputSize;

    // Temporary buffer for PCM output (max AAC frame is 2048 samples * 2 channels)
    const int maxFrameSize = 2048 * 2;
    short* pcmBuffer = (short*)malloc(maxFrameSize * sizeof(short));
    if (!pcmBuffer) {
        free(inputCopy);
        AACFreeDecoder(decoder);
        return -1;
    }

    // Collect all decoded frames
    std::vector<short> allSamples;
    AACFrameInfo frameInfo;
    int channels = 0;
    int sampRate = 0;

    while (bytesLeft > 0) {
        int offset = AACFindSyncWord(inputPtr, bytesLeft);
        if (offset < 0) {
            break; // No more sync words
        }

        inputPtr += offset;
        bytesLeft -= offset;

        int err = AACDecode(decoder, &inputPtr, &bytesLeft, pcmBuffer);
        if (err != 0) {
            // Decode error, try to continue
            inputPtr++;
            bytesLeft--;
            continue;
        }

        AACGetLastFrameInfo(decoder, &frameInfo);

        if (channels == 0) {
            channels = frameInfo.nChans;
            sampRate = frameInfo.sampRateOut;
        }

        // Add decoded samples to vector
        int frameSamples = frameInfo.outputSamps;
        for (int i = 0; i < frameSamples; i++) {
            allSamples.push_back(pcmBuffer[i]);
        }
    }

    free(pcmBuffer);
    free(inputCopy);
    AACFreeDecoder(decoder);

    if (allSamples.empty() || channels == 0) {
        return -1;
    }

    // Convert int16 to float32
    *totalSamples = allSamples.size();
    *sampleRate = sampRate;
    *output = (float*)malloc(*totalSamples * sizeof(float));
    if (!*output) {
        return -1;
    }

    for (size_t i = 0; i < *totalSamples; i++) {
        (*output)[i] = allSamples[i] / 32768.0f;
    }

    return channels;
}

// Resample audio using Speex resampler (high quality, SIMD-optimized)
// Returns: resampled buffer (caller must free), or NULL on error
// Output format: interleaved float32 samples at target sample rate
EMSCRIPTEN_KEEPALIVE
float* resampleAudio(const float* input, size_t inputFrames, int channels,
                     int sourceSampleRate, int targetSampleRate, size_t* outputFrames) {
    // No resampling needed
    if (sourceSampleRate == targetSampleRate) {
        *outputFrames = inputFrames;
        size_t totalSamples = inputFrames * channels;
        float* output = (float*)malloc(totalSamples * sizeof(float));
        if (output) {
            memcpy(output, input, totalSamples * sizeof(float));
        }
        return output;
    }

    // Initialize Speex resampler
    // Quality 3 = desktop quality (good balance of speed and quality)
    // This is what Firefox uses for Web Audio API resampling
    int err = 0;
    SpeexResamplerState* resampler = speex_resampler_init(
        channels,
        sourceSampleRate,
        targetSampleRate,
        3,  // quality: 0=worst/fastest, 10=best/slowest, 3=desktop default
        &err
    );

    if (!resampler || err != RESAMPLER_ERR_SUCCESS) {
        if (resampler) {
            speex_resampler_destroy(resampler);
        }
        return NULL;
    }

    // Calculate approximate output size
    // Speex will tell us the exact output size during processing
    double ratio = (double)targetSampleRate / (double)sourceSampleRate;
    size_t estimatedOutputFrames = (size_t)((double)inputFrames * ratio + 1.0);

    float* output = (float*)malloc(estimatedOutputFrames * channels * sizeof(float));
    if (!output) {
        speex_resampler_destroy(resampler);
        return NULL;
    }

    // Speex processes interleaved data
    spx_uint32_t inLen = inputFrames;
    spx_uint32_t outLen = estimatedOutputFrames;

    err = speex_resampler_process_interleaved_float(
        resampler,
        input,
        &inLen,
        output,
        &outLen
    );

    speex_resampler_destroy(resampler);

    if (err != RESAMPLER_ERR_SUCCESS) {
        free(output);
        return NULL;
    }

    *outputFrames = outLen;
    return output;
}

// Free memory allocated by decoders
EMSCRIPTEN_KEEPALIVE
void freeDecodedBuffer(float* buffer) {
    if (buffer) {
        free(buffer);
    }
}

// Unified decoder with automatic format detection
// Returns: number of channels, or -1 on error
// Output format: interleaved float32 samples [L, R, L, R, ...]
EMSCRIPTEN_KEEPALIVE
int decodeAudio(const uint8_t* input, size_t inputSize, float** output, size_t* totalSamples, int* sampleRate) {
    if (inputSize < 4) {
        return -1; // Not enough data to detect format
    }

    // Check magic bytes to determine format
    // Note: AAC must be checked before MP3 since AAC's 0xFF 0xFx is a subset of MP3's 0xFF 0xEx

    // AAC: starts with 0xFF 0xFx (ADTS sync word)
    if (input[0] == 0xFF && (input[1] & 0xF0) == 0xF0) {
        return decodeAAC(input, inputSize, output, totalSamples, sampleRate);
    }

    // MP3: starts with 0xFF 0xEx or ID3 tag
    if ((input[0] == 0xFF && (input[1] & 0xE0) == 0xE0) ||
        (input[0] == 0x49 && input[1] == 0x44 && input[2] == 0x33)) {
        return decodeMP3(input, inputSize, output, totalSamples, sampleRate);
    }

    // WAV: starts with "RIFF"
    if (input[0] == 0x52 && input[1] == 0x49 &&
        input[2] == 0x46 && input[3] == 0x46) {
        return decodeWAV(input, inputSize, output, totalSamples, sampleRate);
    }

    // FLAC: starts with "fLaC"
    if (input[0] == 0x66 && input[1] == 0x4C &&
        input[2] == 0x61 && input[3] == 0x43) {
        return decodeFLAC(input, inputSize, output, totalSamples, sampleRate);
    }

    // OGG: starts with "OggS"
    if (input[0] == 0x4F && input[1] == 0x67 &&
        input[2] == 0x67 && input[3] == 0x53) {
        return decodeVorbis(input, inputSize, output, totalSamples, sampleRate);
    }

    // Unknown format
    return -1;
}

} // extern "C"
