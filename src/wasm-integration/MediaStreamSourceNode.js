// MediaStreamSourceNode - Captures audio from input devices
// Browser-compatible API for audio input using SDL with WASM processing

import sdl from '@kmamal/sdl';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

// Preload WASM module
const createWebAudioModule = (await import(path.join(rootDir, 'dist', 'webaudio.mjs'))).default;
const wasmModule = await createWebAudioModule();

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

        // Create WASM MediaStreamSourceNode with 2 second ring buffer
        this._wasmState = wasmModule._createMediaStreamSourceNode(
            this._sampleRate,
            this._channels,
            2.0 // buffer duration in seconds
        );

        // Note: In WASM-based context, node IDs are managed differently
        // This is a standalone audio source that writes to the ring buffer
        this.nodeId = null; // Not integrated with graph yet

        // Track connections
        this._outputs = [];
    }

    // Find SDL device by deviceId
    _findInputDevice() {
        const devices = sdl.audio.devices || [];

        if (!this._deviceId || this._deviceId === '') {
            // Find first recording device as default
            const defaultDevice = devices.find(d => d.type === 'recording');
            if (!defaultDevice) {
                throw new Error('No audio input devices available');
            }
            return defaultDevice;
        }

        for (const device of devices) {
            if (device.type === 'recording' && hashString(device.name) === this._deviceId) {
                return device;
            }
        }
        throw new Error(`Audio input device not found: ${this._deviceId}`);
    }

    // Start capturing audio
    async start() {
        if (this._isCapturing) return;

        const device = this._findInputDevice();

        // Open SDL recording device with callback that writes to WASM ring buffer
        this._inputDevice = sdl.audio.openDevice(
            device,
            {
                type: 'recording',
                frequency: this._sampleRate,
                channels: this._channels,
                format: 'f32',
                buffered: 65536 // Must be power of 2 (~340ms at 48kHz mono)
            },
            audioData => {
                // Audio callback - write directly to WASM ring buffer
                const sampleCount = audioData.length;

                // Allocate WASM memory for input data
                const inputPtr = wasmModule._malloc(sampleCount * 4); // 4 bytes per float
                const inputHeap = new Float32Array(
                    wasmModule.HEAPF32.buffer,
                    inputPtr,
                    sampleCount
                );
                inputHeap.set(audioData);

                // Write to ring buffer
                wasmModule._writeInputData(this._wasmState, inputPtr, sampleCount);

                // Free input buffer
                wasmModule._free(inputPtr);
            }
        );

        // Start WASM node
        wasmModule._startMediaStreamSource(this._wasmState);

        this._inputDevice.play(); // Start capturing
        this._isCapturing = true;
    }

    // Stop capturing audio
    stop() {
        if (!this._isCapturing) return;

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

        if (destination.nodeId !== undefined) {
            // Connect to audio node
            this.context._engine.connectNodes(this.nodeId, destination.nodeId);
        }

        return destination;
    }

    // Disconnect from a node or all nodes
    disconnect(destination) {
        if (!destination) {
            // Disconnect all
            for (const output of this._outputs) {
                if (output.nodeId !== undefined) {
                    this.context._engine.disconnectNodes(this.nodeId, output.nodeId);
                }
            }
            this._outputs = [];
        } else {
            // Disconnect specific destination
            const index = this._outputs.indexOf(destination);
            if (index !== -1) {
                this._outputs.splice(index, 1);
                if (destination.nodeId !== undefined) {
                    this.context._engine.disconnectNodes(this.nodeId, destination.nodeId);
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
