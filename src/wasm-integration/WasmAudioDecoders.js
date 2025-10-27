// WASM Audio Decoders
// Fast MP3/WAV decoding using dr_libs compiled to WASM

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

// Load WASM decoder module
const createAudioDecodersModule = (await import(path.join(rootDir, 'dist', 'audio_decoders.mjs')))
    .default;
const wasmModule = await createAudioDecodersModule();

export class WasmAudioDecoders {
    /**
     * Resample audio data to target sample rate
     * @param {Float32Array} audioData - Interleaved audio samples
     * @param {number} inputFrames - Number of frames in input
     * @param {number} channels - Number of channels
     * @param {number} sourceSampleRate - Original sample rate
     * @param {number} targetSampleRate - Target sample rate
     * @returns {Object} { audioData: Float32Array, length: number, sampleRate: number }
     */
    static resampleAudio(audioData, inputFrames, channels, sourceSampleRate, targetSampleRate) {
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
        const inputHeap = new Float32Array(wasmModule.HEAPF32.buffer, inputPtr, inputSize);
        inputHeap.set(audioData);

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
        const wasmData = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalOutputSamples);
        resampledData.set(wasmData);

        // Free resampled buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        return {
            audioData: resampledData,
            length: outputFrames,
            sampleRate: targetSampleRate
        };
    }

    static async decodeMP3(arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        // Allocate input buffer in WASM memory
        const inputPtr = wasmModule._malloc(inputSize);
        const inputHeap = new Uint8Array(wasmModule.HEAPU8.buffer, inputPtr, inputSize);
        inputHeap.set(uint8Data);

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
        const wasmData = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalSamples);
        decodedData.set(wasmData);

        // Free decoded buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
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

    static async decodeWAV(arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        // Allocate input buffer in WASM memory
        const inputPtr = wasmModule._malloc(inputSize);
        const inputHeap = new Uint8Array(wasmModule.HEAPU8.buffer, inputPtr, inputSize);
        inputHeap.set(uint8Data);

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
        const wasmData = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalSamples);
        decodedData.set(wasmData);

        // Free decoded buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
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

    static async decodeFLAC(arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        const inputPtr = wasmModule._malloc(inputSize);
        const inputHeap = new Uint8Array(wasmModule.HEAPU8.buffer, inputPtr, inputSize);
        inputHeap.set(uint8Data);

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
        const wasmData = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalSamples);
        decodedData.set(wasmData);

        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
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

    static async decodeVorbis(arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        const inputPtr = wasmModule._malloc(inputSize);
        const inputHeap = new Uint8Array(wasmModule.HEAPU8.buffer, inputPtr, inputSize);
        inputHeap.set(uint8Data);

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
        const wasmData = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalSamples);
        decodedData.set(wasmData);

        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
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

    static async decodeAAC(arrayBuffer, targetSampleRate = null) {
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        const inputPtr = wasmModule._malloc(inputSize);
        const inputHeap = new Uint8Array(wasmModule.HEAPU8.buffer, inputPtr, inputSize);
        inputHeap.set(uint8Data);

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
        const wasmData = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalSamples);
        decodedData.set(wasmData);

        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
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

    static async decode(arrayBuffer, targetSampleRate = null) {
        // Auto-detect format using WASM magic byte detection
        const uint8Data = new Uint8Array(arrayBuffer);
        const inputSize = uint8Data.length;

        // Allocate input buffer in WASM memory
        const inputPtr = wasmModule._malloc(inputSize);
        const inputHeap = new Uint8Array(wasmModule.HEAPU8.buffer, inputPtr, inputSize);
        inputHeap.set(uint8Data);

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
        const wasmData = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalSamples);
        decodedData.set(wasmData);

        // Free decoded buffer in WASM
        wasmModule._freeDecodedBuffer(outputPtr);

        // Resample if target sample rate specified and different from source
        if (targetSampleRate && targetSampleRate !== sampleRate) {
            const resampled = this.resampleAudio(
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
