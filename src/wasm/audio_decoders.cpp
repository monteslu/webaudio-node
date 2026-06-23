// Audio format decoders using dr_libs and stb
// Public domain single-header audio decoders

#define DR_MP3_IMPLEMENTATION
#include "../vendor/dr_mp3.h"

#define DR_WAV_IMPLEMENTATION
#include "../vendor/dr_wav.h"

#define DR_FLAC_IMPLEMENTATION
#include "../vendor/dr_flac.h"

#include "../vendor/stb_vorbis.c"

// Opus (Ogg-Opus): libopus + libogg + opusfile (all BSD, royalty-free patents).
// opusfile is a real library (compiled separately + linked), not single-header, so
// we only include its API here. It always decodes to 48 kHz interleaved float.
extern "C" {
#include "../vendor/opusfile/include/opusfile.h"
}

// Speex resampler (BSD license)
#define OUTSIDE_SPEEX
#define RANDOM_PREFIX webaudio
#define FLOATING_POINT  // Use floating point (not fixed point)
#define EXPORT
#include "../vendor/resample.c"

// AAC (AAC-LC / HE-AAC): Ittiam libxaac (ixheaacd), Apache-2.0, actively
// maintained + fuzzed. AAC-LC is patent-free (US patents expired 2017). Replaces
// the old uaac decoder (x86-only inline asm → was disabled on every platform).
// libxaac ships no public header declaring its entry point, so we forward-declare
// ixheaacd_dec_api exactly as its reference test app does.
extern "C" {
#include "../vendor/libxaac/decoder/ixheaacd_type_def.h"
#include "../vendor/libxaac/decoder/ixheaacd_error_standards.h"
#include "../vendor/libxaac/decoder/ixheaacd_apicmd_standards.h"
#include "../vendor/libxaac/decoder/ixheaacd_memory_standards.h"
#include "../vendor/libxaac/decoder/ixheaacd_aac_config.h"
#include "../vendor/libxaac/decoder/ixheaacd_error_codes.h"  // INSUFFICIENT_INPUT_BYTES
IA_ERRORCODE ixheaacd_dec_api(pVOID p_ia_xheaac_dec_obj, WORD32 i_cmd,
                              WORD32 i_idx, pVOID pv_value);
}

#include <emscripten.h>
#include <cstdlib>
#include <cstring>
#include <cstdio>
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

// Decode an Ogg-Opus stream to interleaved float. opusfile always outputs 48 kHz
// (Opus is internally always 48 kHz), so sampleRate is 48000 and no resample is
// needed for our 48 kHz context. Returns channel count, or -1 on error.
EMSCRIPTEN_KEEPALIVE
int decodeOpus(const uint8_t* input, size_t inputSize, float** output, size_t* totalSamples, int* sampleRate) {
    int err = 0;
    OggOpusFile* of = op_open_memory(input, inputSize, &err);
    if (!of || err != 0) { if (of) op_free(of); return -1; }

    int channels = op_channel_count(of, -1);   // -1 = whole stream (first link)
    if (channels < 1 || channels > 8) { op_free(of); return -1; }
    *sampleRate = 48000;  // opusfile always decodes to 48 kHz

    // op_read_float returns samples-per-channel per call; total length may be known
    // (seekable) but isn't guaranteed, so grow the buffer as we decode.
    ogg_int64_t hint = op_pcm_total(of, -1);    // total frames, or negative if unknown
    size_t cap = (hint > 0 ? (size_t)hint : 48000) * channels;  // start at hint, or ~1s
    float* out = (float*)malloc(cap * sizeof(float));
    if (!out) { op_free(of); return -1; }

    size_t filled = 0;            // total floats written
    const int CHUNK = 5760;       // frames per read (120ms @48k, opusfile-recommended)
    for (;;) {
        // ensure room for one more chunk (CHUNK frames * channels floats)
        size_t need = filled + (size_t)CHUNK * channels;
        if (need > cap) {
            cap = need * 2;
            float* grown = (float*)realloc(out, cap * sizeof(float));
            if (!grown) { free(out); op_free(of); return -1; }
            out = grown;
        }
        int n = op_read_float(of, out + filled, (int)((cap - filled)), NULL);
        if (n < 0) { free(out); op_free(of); return -1; }  // decode error
        if (n == 0) break;                                  // end of stream
        filled += (size_t)n * channels;
    }
    op_free(of);

    // Shrink to the actual size (best effort).
    float* fit = (float*)realloc(out, filled * sizeof(float));
    *output = fit ? fit : out;
    *totalSamples = filled;
    return channels;
}

// Decode AAC (ADTS/raw) from a memory buffer to interleaved float samples,
// via Ittiam libxaac. Modeled on libxaac's reference decode flow (test app
// ia_main_process), stripped to a memory-only, DRC-free path. Returns channel
// count (1, 2, ...), or -1 on error.
//
// OUTPUT NOTE: libxaac has no float output mode (PCM_WDSZ accepts only 16/24 and
// ixheaacd_samples_sat writes native-endian WORD16 for 16-bit). So we decode to
// 16-bit PCM and convert each sample to float (s / 32768.0f).
EMSCRIPTEN_KEEPALIVE
int decodeAAC(const uint8_t* input, size_t inputSize, float** output,
              size_t* totalSamples, int* sampleRate) {
    *output = NULL;
    *totalSamples = 0;
    *sampleRate = 0;
    if (input == NULL || inputSize == 0) return -1;

    // Every malloc goes here; all freed at cleanup: on every exit path.
    void* alloc_list[100];
    int alloc_count = 0;

    int ret = -1;
    IA_ERRORCODE err = IA_NO_ERROR;
    pVOID p_api = NULL;
    pWORD8 pb_inp_buf = NULL;
    pWORD8 pb_out_buf = NULL;
    UWORD32 ui_inp_size = 0;

    WORD16* pcm = NULL;
    size_t pcm_count = 0, pcm_cap = 0;

    UWORD32 ui_api_size = 0;
    WORD32 n_mems = 0, i;

    // 1) API size + aligned API object.
    err = ixheaacd_dec_api(NULL, IA_API_CMD_GET_API_SIZE, 0, &ui_api_size);
    if (err & IA_FATAL_ERROR) goto cleanup;
    {
        void* raw = malloc((size_t)ui_api_size + 4);
        if (!raw) goto cleanup;
        alloc_list[alloc_count++] = raw;
        SIZE_T rem = ((SIZE_T)raw & 3);
        p_api = (pVOID)((WORD8*)raw + 4 - rem);
    }

    // 2) INIT pre-config, then force 16-bit PCM out.
    err = ixheaacd_dec_api(p_api, IA_API_CMD_INIT, IA_CMD_TYPE_INIT_API_PRE_CONFIG_PARAMS, NULL);
    if (err & IA_FATAL_ERROR) goto cleanup;
    {
        UWORD32 pcm_wdsz = 16;
        err = ixheaacd_dec_api(p_api, IA_API_CMD_SET_CONFIG_PARAM,
                               IA_XHEAAC_DEC_CONFIG_PARAM_PCM_WDSZ, &pcm_wdsz);
        if (err & IA_FATAL_ERROR) goto cleanup;
    }

    // 3) memtabs-ptr block.
    {
        UWORD32 ui_memtabs_size = 0;
        err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_MEMTABS_SIZE, 0, &ui_memtabs_size);
        if (err & IA_FATAL_ERROR) goto cleanup;
        void* raw = malloc((size_t)ui_memtabs_size + 4);
        if (!raw) goto cleanup;
        alloc_list[alloc_count++] = raw;
        SIZE_T rem = ((SIZE_T)raw & 3);
        err = ixheaacd_dec_api(p_api, IA_API_CMD_SET_MEMTABS_PTR, 0,
                               (pVOID)((WORD8*)raw + 4 - rem));
        if (err & IA_FATAL_ERROR) goto cleanup;
    }

    // 4) INIT post-config (library fills memory-info tables).
    err = ixheaacd_dec_api(p_api, IA_API_CMD_INIT, IA_CMD_TYPE_INIT_API_POST_CONFIG_PARAMS, NULL);
    if (err & IA_FATAL_ERROR) goto cleanup;

    // 5) allocate each memtab; capture INPUT/OUTPUT buffers.
    err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_N_MEMTABS, 0, &n_mems);
    if (err & IA_FATAL_ERROR) goto cleanup;
    for (i = 0; i < n_mems; i++) {
        WORD32 ui_size = 0, ui_alignment = 0, ui_type = 0;
        err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_MEM_INFO_SIZE, i, &ui_size);
        if (err & IA_FATAL_ERROR) goto cleanup;
        err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_MEM_INFO_ALIGNMENT, i, &ui_alignment);
        if (err & IA_FATAL_ERROR) goto cleanup;
        err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_MEM_INFO_TYPE, i, &ui_type);
        if (err & IA_FATAL_ERROR) goto cleanup;
        if (ui_alignment <= 0) ui_alignment = 1;
        void* raw = malloc((size_t)ui_size + (size_t)ui_alignment);
        if (!raw) goto cleanup;
        alloc_list[alloc_count++] = raw;
        SIZE_T rem = ((SIZE_T)raw % (SIZE_T)ui_alignment);
        pVOID aligned = (pVOID)((WORD8*)raw + ui_alignment - rem);
        err = ixheaacd_dec_api(p_api, IA_API_CMD_SET_MEM_PTR, i, aligned);
        if (err & IA_FATAL_ERROR) goto cleanup;
        if (ui_type == IA_MEMTYPE_INPUT) { pb_inp_buf = (pWORD8)aligned; ui_inp_size = (UWORD32)ui_size; }
        else if (ui_type == IA_MEMTYPE_OUTPUT) { pb_out_buf = (pWORD8)aligned; }
    }
    if (pb_inp_buf == NULL || pb_out_buf == NULL || ui_inp_size == 0) goto cleanup;

    {
        size_t in_off = 0;
        bool input_over_sent = false;

        // 6) init-process loop (handles junk before the first valid frame).
        {
            WORD32 init_done = 0, last_err = 0;
            do {
                WORD32 bytes_avail = 0;
                if (in_off < inputSize) {
                    size_t remaining = inputSize - in_off;
                    size_t chunk = remaining < (size_t)ui_inp_size ? remaining : (size_t)ui_inp_size;
                    memcpy(pb_inp_buf, input + in_off, chunk);
                    bytes_avail = (WORD32)chunk;
                }
                if (bytes_avail <= 0 ||
                    (last_err == (WORD32)IA_XHEAAC_DEC_EXE_NONFATAL_INSUFFICIENT_INPUT_BYTES && in_off >= inputSize)) {
                    if (!input_over_sent) {
                        err = ixheaacd_dec_api(p_api, IA_API_CMD_INPUT_OVER, 0, NULL);
                        input_over_sent = true;
                        if (err & IA_FATAL_ERROR) goto cleanup;
                    }
                    goto cleanup;  // ran out before init completed
                }
                err = ixheaacd_dec_api(p_api, IA_API_CMD_SET_INPUT_BYTES, 0, &bytes_avail);
                if (err & IA_FATAL_ERROR) goto cleanup;
                err = ixheaacd_dec_api(p_api, IA_API_CMD_INIT, IA_CMD_TYPE_INIT_PROCESS, NULL);
                last_err = err;
                if (err & IA_FATAL_ERROR) goto cleanup;
                err = ixheaacd_dec_api(p_api, IA_API_CMD_INIT, IA_CMD_TYPE_INIT_DONE_QUERY, &init_done);
                if (err & IA_FATAL_ERROR) goto cleanup;
                {
                    WORD32 consumed = 0;
                    err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_CURIDX_INPUT_BUF, 0, &consumed);
                    if (err & IA_FATAL_ERROR) goto cleanup;
                    if (consumed < 0) consumed = 0;
                    if ((size_t)consumed > (size_t)bytes_avail) consumed = bytes_avail;
                    in_off += (size_t)consumed;
                }
            } while (!init_done);
        }

        // 7) read decoded config.
        {
            WORD32 samp_freq = 0, num_chan = 0;
            err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_CONFIG_PARAM, IA_XHEAAC_DEC_CONFIG_PARAM_SAMP_FREQ, &samp_freq);
            if (err & IA_FATAL_ERROR) goto cleanup;
            err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_CONFIG_PARAM, IA_XHEAAC_DEC_CONFIG_PARAM_NUM_CHANNELS, &num_chan);
            if (err & IA_FATAL_ERROR) goto cleanup;
            if (num_chan < 1 || samp_freq <= 0) goto cleanup;
            *sampleRate = (int)samp_freq;
            ret = (int)num_chan;
        }

        // 8) steady-state execute loop.
        {
            WORD32 exec_done = 0, last_err = 0;
            do {
                WORD32 bytes_avail = 0;
                if (in_off < inputSize) {
                    size_t remaining = inputSize - in_off;
                    size_t chunk = remaining < (size_t)ui_inp_size ? remaining : (size_t)ui_inp_size;
                    memcpy(pb_inp_buf, input + in_off, chunk);
                    bytes_avail = (WORD32)chunk;
                }
                if (bytes_avail <= 0 ||
                    (last_err == (WORD32)IA_XHEAAC_DEC_EXE_NONFATAL_INSUFFICIENT_INPUT_BYTES && in_off >= inputSize)) {
                    if (!input_over_sent) {
                        err = ixheaacd_dec_api(p_api, IA_API_CMD_INPUT_OVER, 0, NULL);
                        input_over_sent = true;
                        if (err & IA_FATAL_ERROR) goto cleanup;
                    }
                }
                err = ixheaacd_dec_api(p_api, IA_API_CMD_SET_INPUT_BYTES, 0, &bytes_avail);
                if (err & IA_FATAL_ERROR) goto cleanup;
                err = ixheaacd_dec_api(p_api, IA_API_CMD_EXECUTE, IA_CMD_TYPE_DO_EXECUTE, NULL);
                last_err = err;
                if (err & IA_FATAL_ERROR) goto cleanup;
                err = ixheaacd_dec_api(p_api, IA_API_CMD_EXECUTE, IA_CMD_TYPE_DONE_QUERY, &exec_done);
                if (err & IA_FATAL_ERROR) goto cleanup;
                {
                    WORD32 consumed = 0;
                    err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_CURIDX_INPUT_BUF, 0, &consumed);
                    if (err & IA_FATAL_ERROR) goto cleanup;
                    if (consumed < 0) consumed = 0;
                    if ((size_t)consumed > (size_t)bytes_avail) consumed = bytes_avail;
                    in_off += (size_t)consumed;
                }
                {
                    WORD32 out_bytes = 0;
                    err = ixheaacd_dec_api(p_api, IA_API_CMD_GET_OUTPUT_BYTES, 0, &out_bytes);
                    if (err & IA_FATAL_ERROR) goto cleanup;
                    if (out_bytes > 0) {
                        size_t n_samp = (size_t)out_bytes / sizeof(WORD16);
                        if (pcm_count + n_samp > pcm_cap) {
                            size_t new_cap = (pcm_cap == 0) ? (n_samp + 4096) : (pcm_cap * 2);
                            if (new_cap < pcm_count + n_samp) new_cap = pcm_count + n_samp;
                            WORD16* grown = (WORD16*)realloc(pcm, new_cap * sizeof(WORD16));
                            if (!grown) goto cleanup;
                            pcm = grown; pcm_cap = new_cap;
                        }
                        memcpy(pcm + pcm_count, pb_out_buf, (size_t)out_bytes);
                        pcm_count += n_samp;
                    }
                }
                if (input_over_sent && exec_done == 0) {
                    WORD32 ob = 0;
                    ixheaacd_dec_api(p_api, IA_API_CMD_GET_OUTPUT_BYTES, 0, &ob);
                    if (ob <= 0) break;
                }
            } while (!exec_done);
        }
    }

    // 9) convert 16-bit PCM -> float.
    if (pcm_count == 0) { ret = -1; goto cleanup; }
    {
        float* out = (float*)malloc(pcm_count * sizeof(float));
        if (!out) { ret = -1; goto cleanup; }
        for (size_t k = 0; k < pcm_count; k++) out[k] = (float)pcm[k] / 32768.0f;
        *output = out;
        *totalSamples = pcm_count;
    }

cleanup:
    if (pcm) free(pcm);
    for (int j = 0; j < alloc_count; j++) free(alloc_list[j]);
    if (ret < 0) { *output = NULL; *totalSamples = 0; }
    return ret;
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
    // Quality 1 = fast with decent quality (balance of speed and quality)
    // Quality 3 was adding 277% overhead for 44.1kHz->48kHz conversion
    // Quality 0 improved MP3 decode but may have quality issues
    int err = 0;
    SpeexResamplerState* resampler = speex_resampler_init(
        channels,
        sourceSampleRate,
        targetSampleRate,
        1,  // quality: 0=worst/fastest, 10=best/slowest
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

    // Check magic bytes to determine format.
    //
    // ADTS-AAC vs MP3 BOTH start with 0xFF and an 0xEx/0xFx second byte, so order
    // and bit-precision matter. The MPEG frame header layout of byte[1] is:
    //   1111 1xxx (sync) | mpeg-version-bit | LL (layer, 2 bits) | protection-bit
    // For ADTS the LAYER field (bits 2-1, mask 0x06) is always 00; for MP3 it is
    // 01/10/11 (never 00). So check ADTS FIRST (syncword 0xFFFx AND layer==00),
    // and only then MP3 — otherwise an ADTS stream (e.g. 0xFFF1) matches the MP3
    // 0xFF 0xEx test and gets mis-routed to the MP3 decoder.

    // AAC (ADTS): 0xFFFx with the layer field == 00. Decode via libxaac.
    if (input[0] == 0xFF && (input[1] & 0xF0) == 0xF0 && (input[1] & 0x06) == 0x00) {
        return decodeAAC(input, inputSize, output, totalSamples, sampleRate);
    }

    // MP3: 0xFF 0xEx/0xFx frame sync (layer != 00), or an ID3 tag.
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

    // OGG container ("OggS") — holds either Vorbis or Opus. The codec id lives in
    // the first page's body: "OpusHead" for Opus, "\x01vorbis" for Vorbis. Scan the
    // first page (its segment table starts at byte 27) for the marker.
    if (input[0] == 0x4F && input[1] == 0x67 &&
        input[2] == 0x67 && input[3] == 0x53) {
        // Look for "OpusHead" within the first ~512 bytes (first page header+body).
        size_t scan = inputSize < 512 ? inputSize : 512;
        for (size_t i = 0; i + 8 <= scan; i++) {
            if (memcmp(input + i, "OpusHead", 8) == 0) {
                return decodeOpus(input, inputSize, output, totalSamples, sampleRate);
            }
        }
        return decodeVorbis(input, inputSize, output, totalSamples, sampleRate);
    }

    // Unknown format
    return -1;
}

} // extern "C"
