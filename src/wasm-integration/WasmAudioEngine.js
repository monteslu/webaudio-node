// Thin wrapper around WASM AudioGraph
// All heavy lifting (graph traversal, mixing, processing) is done in WASM

import { wasmModule as defaultWasmModule } from './WasmModule.js';

// Parameter name to ID mapping - matches C++ ParamID enum
// Eliminates malloc/copy/free overhead on every parameter change
const PARAM_ID_MAP = {
    'frequency': 0,
    'detune': 1,
    'gain': 2,
    'Q': 3,
    'delayTime': 4,
    'pan': 5,
    'offset': 6,
    'type': 7,
    'playbackOffset': 8,
    'playbackDuration': 9,
    'loop': 10,
    'loopStart': 11,
    'loopEnd': 12,
    'refDistance': 13,
    'maxDistance': 14,
    'rolloffFactor': 15,
    'coneInnerAngle': 16,
    'coneOuterAngle': 17,
    'coneOuterGain': 18,
    'threshold': 19,
    'knee': 20,
    'ratio': 21,
    'attack': 22,
    'release': 23,
    'positionX': 24,
    'positionY': 25,
    'positionZ': 26,
    'orientationX': 27,
    'orientationY': 28,
    'orientationZ': 29
};

// Helper to safely copy data to WASM heap, handling potential memory growth
function copyToWasmHeap(wasmModule, data, ptr) {
    // Ensure data is a Float32Array
    const floatArray = data instanceof Float32Array ? data : new Float32Array(data);

    // Create a fresh Float32Array view directly from the current heap buffer
    // This ensures we're always using the latest buffer after any potential memory growth
    // Use HEAPU8.buffer to get the current ArrayBuffer (HEAPU8 is always defined in Emscripten)
    const floatIndex = ptr >> 2;
    const heapView = new Float32Array(wasmModule.HEAPU8.buffer, ptr, floatArray.length);

    // Validate bounds BEFORE copying
    if (floatIndex + floatArray.length > (wasmModule.HEAPU8.buffer.byteLength >> 2)) {
        console.error('[copyToWasmHeap ERROR]');
        console.error(`  ptr=${ptr} (0x${ptr.toString(16)})`);
        console.error(`  floatIndex=${floatIndex}`);
        console.error(`  data.length=${floatArray.length}`);
        console.error(`  required end=${floatIndex + floatArray.length}`);
        console.error(`  heap buffer byteLength=${wasmModule.HEAPU8.buffer.byteLength}`);
        console.error('  Stack trace:', new Error().stack);
        throw new Error(`copyToWasmHeap: offset ${floatIndex} + length ${floatArray.length} exceeds heap size`);
    }

    heapView.set(floatArray);
}

export class WasmAudioEngine {
    constructor(numberOfChannels, length, sampleRate, isRealtime = false, wasmModule = null) {
        this.numberOfChannels = numberOfChannels;
        this.length = length;
        this.sampleRate = sampleRate;

        // Use provided WASM module or default singleton
        this.wasmModule = wasmModule || defaultWasmModule;

        // Create WASM AudioGraph
        this.graphId = this.wasmModule._createAudioGraph(
            this.sampleRate,
            this.numberOfChannels,
            128, // buffer size (standard Web Audio quantum)
            isRealtime ? 1 : 0 // Convert boolean to integer for C++
        );
        this.initialized = true;
    }

    createNode(type, _options = {}) {
        // Just forward to WASM - no JavaScript graph management!
        // Allocate string in WASM memory
        const lengthBytes = this.wasmModule.lengthBytesUTF8(type) + 1;
        const typePtr = this.wasmModule._malloc(lengthBytes);
        this.wasmModule.stringToUTF8(type, typePtr, lengthBytes);

        const nodeId = this.wasmModule._createNode(this.graphId, typePtr);
        this.wasmModule._free(typePtr);
        return nodeId;
    }

    connectNodes(sourceId, destId, sourceOutput = 0, destInput = 0) {
        this.wasmModule._connectNodes(this.graphId, sourceId, destId, sourceOutput, destInput);
    }

    connectToParam(sourceId, destId, paramName, sourceOutput = 0) {
        const lengthBytes = this.wasmModule.lengthBytesUTF8(paramName) + 1;
        const paramNamePtr = this.wasmModule._malloc(lengthBytes);
        this.wasmModule.stringToUTF8(paramName, paramNamePtr, lengthBytes);

        this.wasmModule._connectToParam(this.graphId, sourceId, destId, paramNamePtr, sourceOutput);
        this.wasmModule._free(paramNamePtr);
    }

    disconnectNode(_nodeId) {
        // TODO: Implement disconnect in WASM
    }

    setNodeParameter(nodeId, paramName, value) {
        // Map parameter name to integer ID - eliminates malloc/copy/free overhead
        const paramId = PARAM_ID_MAP[paramName];
        if (paramId === undefined) {
            console.warn(`Unknown parameter: ${paramName}`);
            return;
        }

        this.wasmModule._setNodeParameter(this.graphId, nodeId, paramId, value);
    }

    setNodeBuffer(nodeId, bufferData, length, channels) {
        // Allocate WASM memory for buffer data
        const totalSamples = length * channels;
        const bufferPtr = this.wasmModule._malloc(totalSamples * 4); // 4 bytes per float

        // Copy data to WASM heap
        copyToWasmHeap(this.wasmModule, bufferData, bufferPtr);

        this.wasmModule._setNodeBuffer(this.graphId, nodeId, bufferPtr, length, channels);

        // Free the temporary buffer - WASM copies the data internally
        this.wasmModule._free(bufferPtr);
    }

    setIIRFilterCoefficients(nodeId, feedforward, feedback) {
        // Allocate WASM memory for feedforward coefficients
        const ffPtr = this.wasmModule._malloc(feedforward.length * 4);
        copyToWasmHeap(this.wasmModule, feedforward, ffPtr);

        // Allocate WASM memory for feedback coefficients
        const fbPtr = this.wasmModule._malloc(feedback.length * 4);
        copyToWasmHeap(this.wasmModule, feedback, fbPtr);

        this.wasmModule._setIIRFilterCoefficients(
            this.graphId,
            nodeId,
            ffPtr,
            feedforward.length,
            fbPtr,
            feedback.length
        );

        // Free the temporary coefficient arrays
        this.wasmModule._free(ffPtr);
        this.wasmModule._free(fbPtr);
    }

    scheduleParameterValue(nodeId, paramName, value, time) {
        const lengthBytes = this.wasmModule.lengthBytesUTF8(paramName) + 1;
        const paramNamePtr = this.wasmModule._malloc(lengthBytes);
        this.wasmModule.stringToUTF8(paramName, paramNamePtr, lengthBytes);

        this.wasmModule._scheduleParameterValue(this.graphId, nodeId, paramNamePtr, value, time);
        this.wasmModule._free(paramNamePtr);
    }

    scheduleParameterRamp(nodeId, paramName, value, time, exponential) {
        const lengthBytes = this.wasmModule.lengthBytesUTF8(paramName) + 1;
        const paramNamePtr = this.wasmModule._malloc(lengthBytes);
        this.wasmModule.stringToUTF8(paramName, paramNamePtr, lengthBytes);

        this.wasmModule._scheduleParameterRamp(
            this.graphId,
            nodeId,
            paramNamePtr,
            value,
            time,
            exponential
        );
        this.wasmModule._free(paramNamePtr);
    }

    startNode(nodeId, when = 0) {
        this.wasmModule._startNode(this.graphId, nodeId, when);
    }

    stopNode(nodeId, when = 0) {
        this.wasmModule._stopNode(this.graphId, nodeId, when);
    }

    registerBuffer(bufferId, bufferData, length, channels) {
        const totalSamples = length * channels;
        const bufferPtr = this.wasmModule._malloc(totalSamples * 4);

        // Use HEAPF32.set() with subarray (avoids alignment issues and is fast)
        copyToWasmHeap(this.wasmModule, bufferData, bufferPtr);

        this.wasmModule._registerBuffer(this.graphId, bufferId, bufferPtr, length, channels);
        // Don't free - WASM keeps a reference
    }

    setNodeBufferId(nodeId, bufferId) {
        this.wasmModule._setNodeBufferId(this.graphId, nodeId, bufferId);
    }

    setWaveShaperCurve(nodeId, curve) {
        const curvePtr = this.wasmModule._malloc(curve.length * 4);

        // Use HEAPF32.set() with subarray (avoids alignment issues and is fast)
        copyToWasmHeap(this.wasmModule, curve, curvePtr);

        this.wasmModule._setWaveShaperCurve(this.graphId, nodeId, curvePtr, curve.length);
        // Free the temporary curve - WASM copies the data internally
        this.wasmModule._free(curvePtr);
    }

    clearWaveShaperCurve(nodeId) {
        // Set curve to null by passing 0 length
        this.wasmModule._setWaveShaperCurve(this.graphId, nodeId, 0, 0);
    }

    setNodePeriodicWave(nodeId, wavetable) {
        const wavetablePtr = this.wasmModule._malloc(wavetable.length * 4);

        // Use HEAPF32.set() with subarray (avoids alignment issues and is fast)
        copyToWasmHeap(this.wasmModule, wavetable, wavetablePtr);

        this.wasmModule._setNodePeriodicWave(this.graphId, nodeId, wavetablePtr, wavetable.length);
        // Free the temporary wavetable - WASM copies the data internally
        this.wasmModule._free(wavetablePtr);
    }

    setWaveShaperOversample(nodeId, oversample) {
        // Convert string oversample to C string
        const valLengthBytes = this.wasmModule.lengthBytesUTF8(oversample) + 1;
        const valPtr = this.wasmModule._malloc(valLengthBytes);
        this.wasmModule.stringToUTF8(oversample, valPtr, valLengthBytes);

        this.wasmModule._setWaveShaperOversample(this.graphId, nodeId, valPtr);
        this.wasmModule._free(valPtr);
    }

    setNodeProperty(nodeId, property, value) {
        const lengthBytes = this.wasmModule.lengthBytesUTF8(property) + 1;
        const propertyPtr = this.wasmModule._malloc(lengthBytes);
        this.wasmModule.stringToUTF8(property, propertyPtr, lengthBytes);

        this.wasmModule._setNodeProperty(this.graphId, nodeId, propertyPtr, value);
        this.wasmModule._free(propertyPtr);
    }

    setNodeStringProperty(nodeId, property, value) {
        const propLengthBytes = this.wasmModule.lengthBytesUTF8(property) + 1;
        const propPtr = this.wasmModule._malloc(propLengthBytes);
        this.wasmModule.stringToUTF8(property, propPtr, propLengthBytes);

        const valLengthBytes = this.wasmModule.lengthBytesUTF8(value) + 1;
        const valPtr = this.wasmModule._malloc(valLengthBytes);
        this.wasmModule.stringToUTF8(value, valPtr, valLengthBytes);

        this.wasmModule._setNodeStringProperty(this.graphId, nodeId, propPtr, valPtr);
        this.wasmModule._free(propPtr);
        this.wasmModule._free(valPtr);
    }

    // Analyser methods
    setAnalyserFFTSize(nodeId, fftSize) {
        this.setNodeProperty(nodeId, 'fftSize', fftSize);
    }

    setAnalyserMinDecibels(nodeId, minDecibels) {
        this.setNodeProperty(nodeId, 'minDecibels', minDecibels);
    }

    setAnalyserMaxDecibels(nodeId, maxDecibels) {
        this.setNodeProperty(nodeId, 'maxDecibels', maxDecibels);
    }

    setAnalyserSmoothingTimeConstant(nodeId, smoothingTimeConstant) {
        this.setNodeProperty(nodeId, 'smoothingTimeConstant', smoothingTimeConstant);
    }

    getFloatFrequencyData(_nodeId, _array) {
        // TODO: Implement in WASM
    }

    getByteFrequencyData(_nodeId, _array) {
        // TODO: Implement in WASM
    }

    getFloatTimeDomainData(_nodeId, _array) {
        // TODO: Implement in WASM
    }

    getByteTimeDomainData(_nodeId, _array) {
        // TODO: Implement in WASM
    }

    // Get current time from WASM (sample-accurate)
    getCurrentTime() {
        if (!this.initialized) return 0;
        return this.wasmModule._getGraphCurrentTime(this.graphId);
    }

    // Set current time for real-time playback (for scheduled start/stop times)
    // NOTE: This should generally not be called for real-time contexts,
    // as WASM manages timing internally via sample counting
    setCurrentTime(time) {
        if (!this.initialized) return;
        this.wasmModule._setGraphCurrentTime(this.graphId, time);
    }

    renderBlock(outputArray, frameCount) {
        if (!this.initialized) return;

        const totalSamples = frameCount * this.numberOfChannels;

        // Allocate temp buffer in WASM
        const outputPtr = this.wasmModule._malloc(totalSamples * 4);

        // Process graph in WASM
        this.wasmModule._processGraph(this.graphId, outputPtr, frameCount);

        // Copy result to output array using subarray (fast and avoids alignment issues)
        const floatIndex = outputPtr >> 2;
        outputArray.set(this.wasmModule.HEAPF32.subarray(floatIndex, floatIndex + totalSamples));

        // Free temp buffer
        this.wasmModule._free(outputPtr);
    }

    async render() {
        // Allocate output buffer in WASM memory (interleaved)
        const totalSamples = this.length * this.numberOfChannels;
        const interleavedPtr = this.wasmModule._malloc(totalSamples * 4);

        // Process in blocks (standard Web Audio quantum size)
        const blockSize = 128;
        const totalBlocks = Math.ceil(this.length / blockSize);

        for (let block = 0; block < totalBlocks; block++) {
            const startFrame = block * blockSize;
            const framesToProcess = Math.min(blockSize, this.length - startFrame);

            // Call WASM processGraph - ALL graph traversal and processing happens in WASM!
            this.wasmModule._processGraph(
                this.graphId,
                interleavedPtr + startFrame * this.numberOfChannels * 4,
                framesToProcess
            );
        }

        // Allocate buffer for de-interleaved output (planar format)
        const planarPtr = this.wasmModule._malloc(totalSamples * 4);

        // De-interleave in WASM (SIMD-optimized!) instead of JavaScript
        this.wasmModule._deinterleaveAudio(interleavedPtr, planarPtr, this.length, this.numberOfChannels);

        // Copy planar result to JavaScript array
        const floatIndex = planarPtr >> 2;
        const result = new Float32Array(
            this.wasmModule.HEAPF32.subarray(floatIndex, floatIndex + totalSamples)
        );

        // Free WASM memory
        this.wasmModule._free(interleavedPtr);
        this.wasmModule._free(planarPtr);

        return result;
    }

    destroy() {
        if (this.graphId !== null) {
            this.wasmModule._destroyAudioGraph(this.graphId);
            this.graphId = null;
        }
    }
}
