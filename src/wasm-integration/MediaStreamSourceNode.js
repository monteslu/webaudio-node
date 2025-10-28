// MediaStreamSourceNode - Captures audio from input devices
// Browser-compatible API for audio input using SDL with WASM processing

import sdl from '@kmamal/sdl';
import { wasmModule } from './WasmModule.js';

// Helper to find SDL device by hashed ID
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

export class MediaStreamSourceNode {
    constructor(context, options = {}) {
        this.context = context;
        this._deviceId = options.deviceId || ''; // Empty string = default device
        this._inputDevice = null;
        this._isCapturing = false;
        this._sampleRate = context.sampleRate;
        this._channels = options.channelCount || 1; // Default to mono for input
        this._currentLevel = 0; // RMS level for UI

        // Create WASM MediaStreamSourceNode with balanced ring buffer
        this._wasmState = wasmModule._createMediaStreamSourceNode(
            this._sampleRate,
            this._channels,
            0.15 // buffer duration in seconds (150ms - balance of latency/stability)
        );

        // Create node in the audio graph
        this.nodeId = context._engine.createNode('media-stream-source');

        // Link the graph node to our WASM state
        // We need to set the node's media_stream_source_state pointer
        wasmModule._setMediaStreamSourceState(context._engine.graphId, this.nodeId, this._wasmState);

        // Track connections
        this._outputs = [];
    }

    // Find SDL device by deviceId
    _findInputDevice() {
        if (!this._deviceId || this._deviceId === '') {
            // Return just the type to use SDL's default recording device
            return { type: 'recording' };
        }

        // Find specific device by deviceId
        const devices = sdl.audio.devices || [];
        for (const device of devices) {
            if (device.type === 'recording' && hashString(device.name) === this._deviceId) {
                return device;
            }
        }
        throw new Error(`Audio input device not found: ${this._deviceId}`);
    }

    // Start capturing audio
    async start(deviceOverride) {
        if (this._isCapturing) return;

        // Allow passing device object directly (for CLI device picker)
        const device = deviceOverride || this._findInputDevice();

        // Open SDL recording device (recording uses dequeue, not callbacks)
        this._inputDevice = sdl.audio.openDevice(device, {
            channels: this._channels,
            frequency: this._sampleRate,
            format: 'f32',
            buffered: 8192 // Power of 2
        });

        // Allocate buffer for dequeuing
        this._audioBuffer = Buffer.alloc(8192 * 4); // 8192 samples * 4 bytes per float

        // Set capturing to true BEFORE starting polling (avoid race condition)
        this._isCapturing = true;

        // Start polling loop for dequeuing audio data
        this._pollingInterval = setInterval(() => {
            if (!this._isCapturing) return;

            const bytesRead = this._inputDevice.dequeue(this._audioBuffer);

            if (bytesRead > 0) {
                const audioData = this._audioBuffer.subarray(0, bytesRead);
                const floatData = new Float32Array(
                    audioData.buffer,
                    audioData.byteOffset,
                    audioData.length / 4
                );

                // Calculate RMS level for UI
                let sumSquares = 0;
                for (let i = 0; i < floatData.length; i++) {
                    sumSquares += floatData[i] * floatData[i];
                }
                this._currentLevel = Math.sqrt(sumSquares / floatData.length);

                // Write to WASM ring buffer
                const sampleCount = floatData.length;
                const inputPtr = wasmModule._malloc(sampleCount * 4);
                const inputHeap = new Float32Array(
                    wasmModule.HEAPF32.buffer,
                    inputPtr,
                    sampleCount
                );
                inputHeap.set(floatData);
                wasmModule._writeInputData(this._wasmState, inputPtr, sampleCount);
                wasmModule._free(inputPtr);
            }
        }, 10); // Poll every 10ms

        // Start WASM node
        wasmModule._startMediaStreamSource(this._wasmState);

        this._inputDevice.play(); // Start capturing
    }

    // Stop capturing audio
    stop() {
        if (!this._isCapturing) return;

        // Stop polling
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }

        if (this._inputDevice) {
            this._inputDevice.close();
            this._inputDevice = null;
        }

        wasmModule._stopMediaStreamSource(this._wasmState);
        this._isCapturing = false;
    }

    // Get captured audio data (for processing) - reads from WASM ring buffer
    getAudioData(frameCount) {
        const totalSamples = frameCount * this._channels;

        // Allocate output buffer in WASM
        const outputPtr = wasmModule._malloc(totalSamples * 4);

        // Process audio through WASM (reads from ring buffer)
        wasmModule._processMediaStreamSourceNode(this._wasmState, outputPtr, frameCount);

        // Copy result to JavaScript
        const output = new Float32Array(totalSamples);
        const outputHeap = new Float32Array(wasmModule.HEAPF32.buffer, outputPtr, totalSamples);
        output.set(outputHeap);

        // Free output buffer
        wasmModule._free(outputPtr);

        return output;
    }

    // Get number of samples available in buffer
    getAvailableSamples() {
        return wasmModule._getInputDataAvailable(this._wasmState);
    }

    // Get current RMS level (for UI visualization)
    getCurrentLevel() {
        return this._currentLevel;
    }

    // Write audio data directly (for manual feeding from external source)
    writeInputData(audioData) {
        if (!audioData || audioData.length === 0) return;

        // Convert Buffer to Float32Array if needed
        let floatData;
        if (Buffer.isBuffer(audioData)) {
            // Buffer contains f32 data, reinterpret as Float32Array
            floatData = new Float32Array(
                audioData.buffer,
                audioData.byteOffset,
                audioData.length / 4
            );
        } else if (audioData instanceof Float32Array) {
            floatData = audioData;
        } else {
            throw new Error('audioData must be Buffer or Float32Array');
        }

        const sampleCount = floatData.length;

        // Allocate WASM memory for input data
        const inputPtr = wasmModule._malloc(sampleCount * 4);
        const inputHeap = new Float32Array(
            wasmModule.HEAPF32.buffer,
            inputPtr,
            sampleCount
        );
        inputHeap.set(floatData);

        // Write to ring buffer
        wasmModule._writeInputData(this._wasmState, inputPtr, sampleCount);

        // Free input buffer
        wasmModule._free(inputPtr);
    }

    // Cleanup
    destroy() {
        this.stop();
        if (this._wasmState) {
            wasmModule._destroyMediaStreamSourceNode(this._wasmState);
            this._wasmState = null;
        }
    }

    // Connect to another node
    connect(destination) {
        this._outputs.push(destination);

        // Connect in the audio graph
        if (destination._nodeId !== undefined) {
            this.context._engine.connectNodes(this.nodeId, destination._nodeId);
        }

        return destination;
    }

    // Disconnect from a node or all nodes
    disconnect(destination) {
        if (!destination) {
            // Disconnect all
            for (const output of this._outputs) {
                if (output._nodeId !== undefined) {
                    this.context._engine.disconnectNodes(this.nodeId, output._nodeId);
                }
            }
            this._outputs = [];
        } else {
            // Disconnect specific destination
            const index = this._outputs.indexOf(destination);
            if (index !== -1) {
                this._outputs.splice(index, 1);
                if (destination._nodeId !== undefined) {
                    this.context._engine.disconnectNodes(this.nodeId, destination._nodeId);
                }
            }
        }
    }

    get mediaStream() {
        // Browser compatibility - return fake MediaStream
        return {
            id: 'mediastream-' + this.nodeId,
            active: this._isCapturing,
            getTracks: () => [
                {
                    kind: 'audio',
                    id: 'track-' + this.nodeId,
                    enabled: this._isCapturing,
                    label: this._deviceId || 'default',
                    readyState: this._isCapturing ? 'live' : 'ended'
                }
            ]
        };
    }
}
