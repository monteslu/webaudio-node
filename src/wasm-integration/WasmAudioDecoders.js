// WASM Audio Decoders
// Fast MP3/WAV decoding using dr_libs compiled to WASM

export class WasmAudioDecoders {
    /**
     * De-interleave audio data using WASM (SIMD-optimized)
     * @param {Object} wasmModule - WASM module instance
     * @param {Float32Array} interleavedData - Interleaved audio samples
     * @param {number} frameCount - Number of frames
     * @param {number} channels - Number of channels
     * @returns {Float32Array} Planar audio data
     */
    static deinterleaveAudio(wasmModule, interleavedData, frameCount, channels) {
        const totalSamples = frameCount * channels;

        // Allocate buffers in WASM
        const interleavedPtr = wasmModule._malloc(totalSamples * 4);
        const planarPtr = wasmModule._malloc(totalSamples * 4);

        // Copy interleaved data to WASM
        const floatIndex = interleavedPtr >> 2;
        wasmModule.HEAPF32.set(interleavedData, floatIndex);

        // De-interleave in WASM (uses SIMD!)
        wasmModule._deinterleaveAudio(interleavedPtr, planarPtr, frameCount, channels);

        // Copy planar result back to JavaScript
        const planarFloatIndex = planarPtr >> 2;
        const result = new Float32Array(totalSamples);
        result.set(wasmModule.HEAPF32.subarray(planarFloatIndex, planarFloatIndex + totalSamples));

        // Free WASM memory
        wasmModule._free(interleavedPtr);
        wasmModule._free(planarPtr);

        return result;
    }

    /**
     * Resample audio data to target sample rate
     * @param {Object} wasmModule - WASM module instance
     * @param {Float32Array} audioData - Interleaved audio samples
     * @param {number} inputFrames - Number of frames in input
     * @param {number} channels - Number of channels
     * @param {number} sourceSampleRate - Original sample rate
     * @param {number} targetSampleRate - Target sample rate
     * @returns {Object} { audioData: Float32Array, length: number, sampleRate: number }
     */
    static resampleAudio(
        wasmModule,
        audioData,
        inputFrames,
        channels,
        sourceSampleRate,
        targetSampleRate
    ) {
        // No resampling needed
        if (sourceSampleRate === targetSampleRate) {
            return {
                audioData,
                length: inputFrames,
                sampleRate: sourceSampleRate
            };
        }

        const inputSize = audioData.length;

        // Allocate input buffer in WASM memory
        const inputPtr = wasmModule._malloc(inputSize * 4); // Float32 = 4 bytes
        // CRITICAL: Use subarray() instead of creating view from buffer to avoid stale buffer issues
        const floatIndex = inputPtr >> 2;
        wasmModule.HEAPF32.set(audioData, floatIndex);

        // Prepare output frame count pointer
        const outputFramesPtr = wasmModule._malloc(4);

        // Call WASM resampling function
        const outputPtr = wasmModule._resampleAudio(
            inputPtr,
            inputFrames,
            channels,
            sourceSampleRate,
            targetSampleRate,
            outputFramesPtr
        );

        // Free input buffer
        wasmModule._free(inputPtr);

        if (outputPtr === 0) {
            wasmModule._free(outputFramesPtr);
            throw new Error('Failed to resample audio');
        }

        // Read output frame count
        const outputFrames = wasmModule.HEAPU32[outputFramesPtr >>> 2];
        wasmModule._free(outputFramesPtr);

        // Copy resampled data from WASM heap
        const totalOutputSamples = outputFrames * channels;
        const resampledData = new Float32Array(totalOutputSamples);
        // CRITICAL: Use subarray() to avoid stale buffer issues
        const outFloatIndex = outputPtr >> 2;
        resampledData.set(
            wasmModule.HEAPF32.subarray(outFloatIndex, outFloatIndex + totalOutputSamples)
        );

        // Free resampled buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        return {
            audioData: resampledData,
            length: outputFrames,
            sampleRate: targetSampleRate
        };
    }

    static async decodeMP3(wasmModule, arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        // Allocate input buffer in WASM memory
        const inputPtr = wasmModule._malloc(inputSize);
        // CRITICAL: Use HEAPU8 directly instead of creating view from buffer to avoid stale buffer issues
        wasmModule.HEAPU8.set(uint8Data, inputPtr);

        // Prepare output pointers
        const outputPtrPtr = wasmModule._malloc(4); // pointer to float*
        const totalSamplesPtr = wasmModule._malloc(4); // pointer to size_t
        const sampleRatePtr = wasmModule._malloc(4); // pointer to int

        // Decode MP3
        const channels = wasmModule._decodeMP3(
            inputPtr,
            inputSize,
            outputPtrPtr,
            totalSamplesPtr,
            sampleRatePtr
        );

        // Free input buffer
        wasmModule._free(inputPtr);

        if (channels === -1) {
            wasmModule._free(outputPtrPtr);
            wasmModule._free(totalSamplesPtr);
            wasmModule._free(sampleRatePtr);
            throw new Error('Failed to decode MP3');
        }

        // Read output values
        const outputPtr = wasmModule.HEAPU32[outputPtrPtr >>> 2];
        const totalSamples = wasmModule.HEAPU32[totalSamplesPtr >>> 2];
        const sampleRate = wasmModule.HEAP32[sampleRatePtr >>> 2];

        // Free parameter buffers
        wasmModule._free(outputPtrPtr);
        wasmModule._free(totalSamplesPtr);
        wasmModule._free(sampleRatePtr);

        // Copy decoded data from WASM heap
        const decodedData = new Float32Array(totalSamples);
        // CRITICAL: Use subarray() to avoid stale buffer issues
        const outFloatIndex = outputPtr >> 2;
        decodedData.set(wasmModule.HEAPF32.subarray(outFloatIndex, outFloatIndex + totalSamples));

        // Free decoded buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
                wasmModule,
                decodedData,
                totalSamples / channels,
                channels,
                sampleRate,
                targetSampleRate
            );
            return {
                audioData: resampled.audioData,
                sampleRate: targetSampleRate,
                channels,
                length: resampled.length
            };
        }

        return {
            audioData: decodedData,
            sampleRate,
            channels,
            length: totalSamples / channels
        };
    }

    static async decodeWAV(wasmModule, arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        // Allocate input buffer in WASM memory
        const inputPtr = wasmModule._malloc(inputSize);
        // CRITICAL: Use HEAPU8 directly instead of creating view from buffer to avoid stale buffer issues
        wasmModule.HEAPU8.set(uint8Data, inputPtr);

        // Prepare output pointers
        const outputPtrPtr = wasmModule._malloc(4);
        const totalSamplesPtr = wasmModule._malloc(4);
        const sampleRatePtr = wasmModule._malloc(4);

        // Decode WAV
        const channels = wasmModule._decodeWAV(
            inputPtr,
            inputSize,
            outputPtrPtr,
            totalSamplesPtr,
            sampleRatePtr
        );

        // Free input buffer
        wasmModule._free(inputPtr);

        if (channels === -1) {
            wasmModule._free(outputPtrPtr);
            wasmModule._free(totalSamplesPtr);
            wasmModule._free(sampleRatePtr);
            throw new Error('Failed to decode WAV');
        }

        // Read output values
        const outputPtr = wasmModule.HEAPU32[outputPtrPtr >>> 2];
        const totalSamples = wasmModule.HEAPU32[totalSamplesPtr >>> 2];
        const sampleRate = wasmModule.HEAP32[sampleRatePtr >>> 2];

        // Free parameter buffers
        wasmModule._free(outputPtrPtr);
        wasmModule._free(totalSamplesPtr);
        wasmModule._free(sampleRatePtr);

        // Copy decoded data from WASM heap
        const decodedData = new Float32Array(totalSamples);
        // CRITICAL: Use subarray() to avoid stale buffer issues
        const outFloatIndex = outputPtr >> 2;
        decodedData.set(wasmModule.HEAPF32.subarray(outFloatIndex, outFloatIndex + totalSamples));

        // Free decoded buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
                wasmModule,
                decodedData,
                totalSamples / channels,
                channels,
                sampleRate,
                targetSampleRate
            );
            return {
                audioData: resampled.audioData,
                sampleRate: targetSampleRate,
                channels,
                length: resampled.length
            };
        }

        return {
            audioData: decodedData,
            sampleRate,
            channels,
            length: totalSamples / channels
        };
    }

    static async decodeFLAC(wasmModule, arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        const inputPtr = wasmModule._malloc(inputSize);
        // CRITICAL: Use HEAPU8 directly instead of creating view from buffer to avoid stale buffer issues
        wasmModule.HEAPU8.set(uint8Data, inputPtr);

        const outputPtrPtr = wasmModule._malloc(4);
        const totalSamplesPtr = wasmModule._malloc(4);
        const sampleRatePtr = wasmModule._malloc(4);

        const channels = wasmModule._decodeFLAC(
            inputPtr,
            inputSize,
            outputPtrPtr,
            totalSamplesPtr,
            sampleRatePtr
        );

        wasmModule._free(inputPtr);

        if (channels === -1) {
            wasmModule._free(outputPtrPtr);
            wasmModule._free(totalSamplesPtr);
            wasmModule._free(sampleRatePtr);
            throw new Error('Failed to decode FLAC');
        }

        const outputPtr = wasmModule.HEAPU32[outputPtrPtr >>> 2];
        const totalSamples = wasmModule.HEAPU32[totalSamplesPtr >>> 2];
        const sampleRate = wasmModule.HEAP32[sampleRatePtr >>> 2];

        wasmModule._free(outputPtrPtr);
        wasmModule._free(totalSamplesPtr);
        wasmModule._free(sampleRatePtr);

        const decodedData = new Float32Array(totalSamples);
        // CRITICAL: Use subarray() to avoid stale buffer issues
        const outFloatIndex = outputPtr >> 2;
        decodedData.set(wasmModule.HEAPF32.subarray(outFloatIndex, outFloatIndex + totalSamples));

        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
                wasmModule,
                decodedData,
                totalSamples / channels,
                channels,
                sampleRate,
                targetSampleRate
            );
            return {
                audioData: resampled.audioData,
                sampleRate: targetSampleRate,
                channels,
                length: resampled.length
            };
        }

        return {
            audioData: decodedData,
            sampleRate,
            channels,
            length: totalSamples / channels
        };
    }

    static async decodeVorbis(wasmModule, arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        const inputPtr = wasmModule._malloc(inputSize);
        // CRITICAL: Use HEAPU8 directly instead of creating view from buffer to avoid stale buffer issues
        wasmModule.HEAPU8.set(uint8Data, inputPtr);

        const outputPtrPtr = wasmModule._malloc(4);
        const totalSamplesPtr = wasmModule._malloc(4);
        const sampleRatePtr = wasmModule._malloc(4);

        const channels = wasmModule._decodeVorbis(
            inputPtr,
            inputSize,
            outputPtrPtr,
            totalSamplesPtr,
            sampleRatePtr
        );

        wasmModule._free(inputPtr);

        if (channels === -1) {
            wasmModule._free(outputPtrPtr);
            wasmModule._free(totalSamplesPtr);
            wasmModule._free(sampleRatePtr);
            throw new Error('Failed to decode Vorbis');
        }

        const outputPtr = wasmModule.HEAPU32[outputPtrPtr >>> 2];
        const totalSamples = wasmModule.HEAPU32[totalSamplesPtr >>> 2];
        const sampleRate = wasmModule.HEAP32[sampleRatePtr >>> 2];

        wasmModule._free(outputPtrPtr);
        wasmModule._free(totalSamplesPtr);
        wasmModule._free(sampleRatePtr);

        const decodedData = new Float32Array(totalSamples);
        // CRITICAL: Use subarray() to avoid stale buffer issues
        const outFloatIndex = outputPtr >> 2;
        decodedData.set(wasmModule.HEAPF32.subarray(outFloatIndex, outFloatIndex + totalSamples));

        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
                wasmModule,
                decodedData,
                totalSamples / channels,
                channels,
                sampleRate,
                targetSampleRate
            );
            return {
                audioData: resampled.audioData,
                sampleRate: targetSampleRate,
                channels,
                length: resampled.length
            };
        }

        return {
            audioData: decodedData,
            sampleRate,
            channels,
            length: totalSamples / channels
        };
    }

    static async decodeAAC(wasmModule, arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        const inputPtr = wasmModule._malloc(inputSize);
        // CRITICAL: Use HEAPU8 directly instead of creating view from buffer to avoid stale buffer issues
        wasmModule.HEAPU8.set(uint8Data, inputPtr);

        const outputPtrPtr = wasmModule._malloc(4);
        const totalSamplesPtr = wasmModule._malloc(4);
        const sampleRatePtr = wasmModule._malloc(4);

        const channels = wasmModule._decodeAAC(
            inputPtr,
            inputSize,
            outputPtrPtr,
            totalSamplesPtr,
            sampleRatePtr
        );

        wasmModule._free(inputPtr);

        if (channels === -1) {
            wasmModule._free(outputPtrPtr);
            wasmModule._free(totalSamplesPtr);
            wasmModule._free(sampleRatePtr);
            throw new Error('Failed to decode AAC');
        }

        const outputPtr = wasmModule.HEAPU32[outputPtrPtr >>> 2];
        const totalSamples = wasmModule.HEAPU32[totalSamplesPtr >>> 2];
        const sampleRate = wasmModule.HEAP32[sampleRatePtr >>> 2];

        wasmModule._free(outputPtrPtr);
        wasmModule._free(totalSamplesPtr);
        wasmModule._free(sampleRatePtr);

        const decodedData = new Float32Array(totalSamples);
        // CRITICAL: Use subarray() to avoid stale buffer issues
        const outFloatIndex = outputPtr >> 2;
        decodedData.set(wasmModule.HEAPF32.subarray(outFloatIndex, outFloatIndex + totalSamples));

        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
                wasmModule,
                decodedData,
                totalSamples / channels,
                channels,
                sampleRate,
                targetSampleRate
            );
            return {
                audioData: resampled.audioData,
                sampleRate: targetSampleRate,
                channels,
                length: resampled.length
            };
        }

        return {
            audioData: decodedData,
            sampleRate,
            channels,
            length: totalSamples / channels
        };
    }

    static async decode(wasmModule, arrayBuffer, targetSampleRate = null) {
        // Auto-detect format using WASM magic byte detection
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        // Allocate input buffer in WASM memory
        const inputPtr = wasmModule._malloc(inputSize);
        // CRITICAL: Use HEAPU8 directly instead of creating view from buffer to avoid stale buffer issues
        wasmModule.HEAPU8.set(uint8Data, inputPtr);

        // Prepare output pointers
        const outputPtrPtr = wasmModule._malloc(4);
        const totalSamplesPtr = wasmModule._malloc(4);
        const sampleRatePtr = wasmModule._malloc(4);

        // Decode with auto-detection
        const channels = wasmModule._decodeAudio(
            inputPtr,
            inputSize,
            outputPtrPtr,
            totalSamplesPtr,
            sampleRatePtr
        );

        // Free input buffer
        wasmModule._free(inputPtr);

        if (channels === -1) {
            wasmModule._free(outputPtrPtr);
            wasmModule._free(totalSamplesPtr);
            wasmModule._free(sampleRatePtr);
            throw new Error(
                'Failed to decode audio or unsupported format (MP3, WAV, FLAC, OGG/Vorbis, and AAC are supported)'
            );
        }

        // Read output values
        const outputPtr = wasmModule.HEAPU32[outputPtrPtr >>> 2];
        const totalSamples = wasmModule.HEAPU32[totalSamplesPtr >>> 2];
        const sampleRate = wasmModule.HEAP32[sampleRatePtr >>> 2];

        // Free parameter buffers
        wasmModule._free(outputPtrPtr);
        wasmModule._free(totalSamplesPtr);
        wasmModule._free(sampleRatePtr);

        // Copy decoded data from WASM heap
        const decodedData = new Float32Array(totalSamples);
        // CRITICAL: Use subarray() to avoid stale buffer issues
        const outFloatIndex = outputPtr >> 2;
        decodedData.set(wasmModule.HEAPF32.subarray(outFloatIndex, outFloatIndex + totalSamples));

        // Free decoded buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
                wasmModule,
                decodedData,
                totalSamples / channels,
                channels,
                sampleRate,
                targetSampleRate
            );
            return {
                audioData: resampled.audioData,
                sampleRate: targetSampleRate,
                channels,
                length: resampled.length
            };
        }

        return {
            audioData: decodedData,
            sampleRate,
            channels,
            length: totalSamples / channels
        };
    }
}
