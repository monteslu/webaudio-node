// Thin wrapper around WASM AudioGraph
// All heavy lifting (graph traversal, mixing, processing) is done in WASM

import { wasmModule } from './WasmModule.js';

export class WasmAudioEngine {
    constructor(numberOfChannels, length, sampleRate) {
        this.numberOfChannels = numberOfChannels;
        this.length = length;
        this.sampleRate = sampleRate;

        // Create WASM AudioGraph immediately (WASM is preloaded)
        this.graphId = wasmModule._createAudioGraph(
            this.sampleRate,
            this.numberOfChannels,
            128 // buffer size (standard Web Audio quantum)
        );
        this.initialized = true;
    }

    createNode(type, _options = {}) {
        // Just forward to WASM - no JavaScript graph management!
        // Allocate string in WASM memory
        const lengthBytes = wasmModule.lengthBytesUTF8(type) + 1;
        const typePtr = wasmModule._malloc(lengthBytes);
        wasmModule.stringToUTF8(type, typePtr, lengthBytes);

        const nodeId = wasmModule._createNode(this.graphId, typePtr);
        wasmModule._free(typePtr);
        return nodeId;
    }

    connectNodes(sourceId, destId, sourceOutput = 0, destInput = 0) {
        wasmModule._connectNodes(this.graphId, sourceId, destId, sourceOutput, destInput);
    }

    connectToParam(sourceId, destId, paramName, sourceOutput = 0) {
        const lengthBytes = wasmModule.lengthBytesUTF8(paramName) + 1;
        const paramNamePtr = wasmModule._malloc(lengthBytes);
        wasmModule.stringToUTF8(paramName, paramNamePtr, lengthBytes);

        wasmModule._connectToParam(this.graphId, sourceId, destId, paramNamePtr, sourceOutput);
        wasmModule._free(paramNamePtr);
    }

    disconnectNode(_nodeId) {
        // TODO: Implement disconnect in WASM
    }

    setNodeParameter(nodeId, paramName, value) {
        const lengthBytes = wasmModule.lengthBytesUTF8(paramName) + 1;
        const paramNamePtr = wasmModule._malloc(lengthBytes);
        wasmModule.stringToUTF8(paramName, paramNamePtr, lengthBytes);

        wasmModule._setNodeParameter(this.graphId, nodeId, paramNamePtr, value);
        wasmModule._free(paramNamePtr);
    }

    setNodeBuffer(nodeId, bufferData, length, channels) {
        // Allocate WASM memory for buffer data
        const totalSamples = length * channels;
        const bufferPtr = wasmModule._malloc(totalSamples * 4); // 4 bytes per float

        // Use HEAPF32.set() with subarray (avoids alignment issues and is fast)
        const floatIndex = bufferPtr >> 2;  // Divide by 4 to get Float32 index
        wasmModule.HEAPF32.set(bufferData, floatIndex);

        wasmModule._setNodeBuffer(this.graphId, nodeId, bufferPtr, length, channels);

        // Don't free yet - WASM keeps a reference to it
        // It will be freed when the node is destroyed
    }

    scheduleParameterValue(nodeId, paramName, value, time) {
        const lengthBytes = wasmModule.lengthBytesUTF8(paramName) + 1;
        const paramNamePtr = wasmModule._malloc(lengthBytes);
        wasmModule.stringToUTF8(paramName, paramNamePtr, lengthBytes);

        wasmModule._scheduleParameterValue(this.graphId, nodeId, paramNamePtr, value, time);
        wasmModule._free(paramNamePtr);
    }

    scheduleParameterRamp(nodeId, paramName, value, time, exponential) {
        const lengthBytes = wasmModule.lengthBytesUTF8(paramName) + 1;
        const paramNamePtr = wasmModule._malloc(lengthBytes);
        wasmModule.stringToUTF8(paramName, paramNamePtr, lengthBytes);

        wasmModule._scheduleParameterRamp(
            this.graphId,
            nodeId,
            paramNamePtr,
            value,
            time,
            exponential
        );
        wasmModule._free(paramNamePtr);
    }

    startNode(nodeId, when = 0) {
        wasmModule._startNode(this.graphId, nodeId, when);
    }

    stopNode(nodeId, when = 0) {
        wasmModule._stopNode(this.graphId, nodeId, when);
    }

    registerBuffer(bufferId, bufferData, length, channels) {
        const totalSamples = length * channels;
        const bufferPtr = wasmModule._malloc(totalSamples * 4);

        // Use HEAPF32.set() with subarray (avoids alignment issues and is fast)
        const floatIndex = bufferPtr >> 2;  // Divide by 4 to get Float32 index
        wasmModule.HEAPF32.set(bufferData, floatIndex);

        wasmModule._registerBuffer(this.graphId, bufferId, bufferPtr, length, channels);
        // Don't free - WASM keeps a reference
    }

    setNodeBufferId(nodeId, bufferId) {
        wasmModule._setNodeBufferId(this.graphId, nodeId, bufferId);
    }

    setWaveShaperCurve(nodeId, curve) {
        const curvePtr = wasmModule._malloc(curve.length * 4);

        // Use HEAPF32.set() with subarray (avoids alignment issues and is fast)
        const floatIndex = curvePtr >> 2;
        wasmModule.HEAPF32.set(curve, floatIndex);

        wasmModule._setWaveShaperCurve(this.graphId, nodeId, curvePtr, curve.length);
        // Don't free - WASM keeps a reference
    }

    clearWaveShaperCurve(nodeId) {
        // Set curve to null by passing 0 length
        wasmModule._setWaveShaperCurve(this.graphId, nodeId, 0, 0);
    }

    setNodePeriodicWave(nodeId, wavetable) {
        const wavetablePtr = wasmModule._malloc(wavetable.length * 4);

        // Use HEAPF32.set() with subarray (avoids alignment issues and is fast)
        const floatIndex = wavetablePtr >> 2;
        wasmModule.HEAPF32.set(wavetable, floatIndex);

        wasmModule._setNodePeriodicWave(this.graphId, nodeId, wavetablePtr, wavetable.length);
        // Don't free - WASM keeps a reference
    }

    setWaveShaperOversample(nodeId, oversample) {
        // Convert string oversample to C string
        const valLengthBytes = wasmModule.lengthBytesUTF8(oversample) + 1;
        const valPtr = wasmModule._malloc(valLengthBytes);
        wasmModule.stringToUTF8(oversample, valPtr, valLengthBytes);

        wasmModule._setWaveShaperOversample(this.graphId, nodeId, valPtr);
        wasmModule._free(valPtr);
    }

    setNodeProperty(nodeId, property, value) {
        const lengthBytes = wasmModule.lengthBytesUTF8(property) + 1;
        const propertyPtr = wasmModule._malloc(lengthBytes);
        wasmModule.stringToUTF8(property, propertyPtr, lengthBytes);

        wasmModule._setNodeProperty(this.graphId, nodeId, propertyPtr, value);
        wasmModule._free(propertyPtr);
    }

    setNodeStringProperty(nodeId, property, value) {
        const propLengthBytes = wasmModule.lengthBytesUTF8(property) + 1;
        const propPtr = wasmModule._malloc(propLengthBytes);
        wasmModule.stringToUTF8(property, propPtr, propLengthBytes);

        const valLengthBytes = wasmModule.lengthBytesUTF8(value) + 1;
        const valPtr = wasmModule._malloc(valLengthBytes);
        wasmModule.stringToUTF8(value, valPtr, valLengthBytes);

        wasmModule._setNodeStringProperty(this.graphId, nodeId, propPtr, valPtr);
        wasmModule._free(propPtr);
        wasmModule._free(valPtr);
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

    // Render a single block of audio (for real-time SDL callback)
    renderBlock(outputArray, frameCount) {
        if (!this.initialized) return;

        const totalSamples = frameCount * this.numberOfChannels;

        // Allocate temp buffer in WASM
        const outputPtr = wasmModule._malloc(totalSamples * 4);

        // Process graph in WASM
        wasmModule._processGraph(this.graphId, outputPtr, frameCount);

        // Copy result to output array using subarray (fast and avoids alignment issues)
        const floatIndex = outputPtr >> 2;
        outputArray.set(wasmModule.HEAPF32.subarray(floatIndex, floatIndex + totalSamples));

        // Free temp buffer
        wasmModule._free(outputPtr);
    }

    async render() {
        // Allocate output buffer in WASM memory
        const totalSamples = this.length * this.numberOfChannels;
        const outputPtr = wasmModule._malloc(totalSamples * 4);

        // Process in blocks (standard Web Audio quantum size)
        const blockSize = 128;
        const totalBlocks = Math.ceil(this.length / blockSize);

        for (let block = 0; block < totalBlocks; block++) {
            const startFrame = block * blockSize;
            const framesToProcess = Math.min(blockSize, this.length - startFrame);

            // Call WASM processGraph - ALL graph traversal and processing happens in WASM!
            wasmModule._processGraph(
                this.graphId,
                outputPtr + startFrame * this.numberOfChannels * 4,
                framesToProcess
            );
        }

        // Copy result to JavaScript array using subarray (fast and avoids alignment issues)
        const floatIndex = outputPtr >> 2;
        const result = new Float32Array(
            wasmModule.HEAPF32.subarray(floatIndex, floatIndex + totalSamples)
        );

        // Free WASM memory
        wasmModule._free(outputPtr);

        return result;
    }

    destroy() {
        if (this.graphId !== null) {
            wasmModule._destroyAudioGraph(this.graphId);
            this.graphId = null;
        }
    }
}
