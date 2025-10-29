// Factory function to create a fresh WebAudio implementation with its own WASM instance
// This is useful for test isolation where each test needs a clean WASM heap

import { fileURLToPath } from 'url';
import path from 'path';
import { WasmOfflineAudioContext } from './wasm-integration/WasmOfflineAudioContext.js';
import { WasmAudioContext } from './wasm-integration/WasmAudioContext.js';
import { WasmAudioEngine } from './wasm-integration/WasmAudioEngine.js';
import { WasmAudioDecoders } from './wasm-integration/WasmAudioDecoders.js';
import { AudioDestinationNode } from './javascript/nodes/AudioDestinationNode.js';
import { AudioListener } from './javascript/AudioListener.js';
import { AudioBuffer } from './javascript/AudioBuffer.js';
import sdl from '@kmamal/sdl';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

export async function createWebAudioInstance() {
    // Load WASM module factory and create fresh instance
    const createUnifiedWebAudioModule = (await import(path.join(rootDir, 'dist', 'webaudio.mjs')))
        .default;
    const freshWasmModule = await createUnifiedWebAudioModule();

    // Create isolated context classes
    // These inherit all methods from the parent class but initialize with fresh WASM module
    const IsolatedOfflineAudioContext = class extends WasmOfflineAudioContext {
        constructor(options) {
            // Parse options BEFORE calling super
            let numberOfChannels, length, sampleRate;
            if (typeof options === 'object' && !Array.isArray(options)) {
                numberOfChannels = options.numberOfChannels || 2;
                length = options.length;
                sampleRate = options.sampleRate || 44100;
            } else {
                numberOfChannels = arguments[0];
                length = arguments[1];
                sampleRate = arguments[2];
            }

            if (typeof length !== 'number' || length <= 0) {
                throw new Error('length must be a positive number');
            }

            // Call super with dummy options to satisfy constructor requirement
            super({ numberOfChannels: 2, length: 128, sampleRate: 44100 });

            // Now override everything with fresh WASM module
            this.sampleRate = sampleRate;
            this.length = length;
            this._channels = numberOfChannels;

            // Destroy the default engine created by super
            if (this._engine && this._engine.graphId !== null) {
                this._engine.destroy();
            }

            // Create engine with fresh WASM module
            this._engine = new WasmAudioEngine(
                numberOfChannels,
                length,
                sampleRate,
                freshWasmModule
            );
            this.state = 'suspended';
            this._rendering = false;

            // Recreate destination node and listener with fresh engine
            const destNodeId = this._engine.createNode('destination');
            this.destination = new AudioDestinationNode(this, destNodeId);
            this.listener = new AudioListener(this);
        }

        async decodeAudioData(audioData, successCallback, errorCallback) {
            try {
                // Use fresh WASM module for decoding
                const decoded = await WasmAudioDecoders.decode(
                    freshWasmModule,
                    audioData,
                    this.sampleRate
                );

                const audioBuffer = new AudioBuffer({
                    length: decoded.length,
                    numberOfChannels: decoded.channels,
                    sampleRate: this.sampleRate
                });

                for (let ch = 0; ch < decoded.channels; ch++) {
                    const channelData = audioBuffer._channels[ch];
                    for (let frame = 0; frame < decoded.length; frame++) {
                        channelData[frame] = decoded.audioData[frame * decoded.channels + ch];
                    }
                }

                audioBuffer._updateInternalBuffer();

                if (successCallback) {
                    successCallback(audioBuffer);
                }
                return audioBuffer;
            } catch (error) {
                if (errorCallback) {
                    errorCallback(error);
                }
                throw error;
            }
        }
    };

    const IsolatedAudioContext = class extends WasmAudioContext {
        constructor(options = {}) {
            // Call super with dummy options to satisfy constructor requirement
            super({ sampleRate: 44100 });

            // Detect system default sample rate if not specified
            let defaultSampleRate = 44100;
            if (!options.sampleRate) {
                try {
                    const tempDevice = sdl.audio.openDevice({ type: 'playback' });
                    defaultSampleRate = tempDevice.frequency || 44100;
                    tempDevice.close();
                } catch (err) {
                    console.warn(
                        'Could not detect system sample rate, using 44100 Hz:',
                        err.message
                    );
                }
            }

            this.sampleRate = options.sampleRate || defaultSampleRate;
            this._channels = options.numberOfChannels || 2;
            this._bufferSize = options.bufferSize || 128;

            // Destroy the default engine created by super
            if (this._engine && this._engine.graphId !== null) {
                this._engine.destroy();
            }

            // Create engine with fresh WASM module
            this._engine = new WasmAudioEngine(
                this._channels,
                this._bufferSize * 1000,
                this.sampleRate,
                freshWasmModule
            );

            // Recreate destination node with fresh engine
            const destNodeId = this._engine.createNode('destination');
            this.destination = new AudioDestinationNode(this, destNodeId);

            this.state = 'suspended';
            this._audioDevice = null;
            this._startTime = null;
            this._sinkId = '';
        }

        async decodeAudioData(audioData, successCallback, errorCallback) {
            try {
                // Use fresh WASM module for decoding
                const decoded = await WasmAudioDecoders.decode(
                    freshWasmModule,
                    audioData,
                    this.sampleRate
                );

                const audioBuffer = new AudioBuffer({
                    length: decoded.length,
                    numberOfChannels: decoded.channels,
                    sampleRate: this.sampleRate
                });

                for (let ch = 0; ch < decoded.channels; ch++) {
                    const channelData = audioBuffer._channels[ch];
                    for (let frame = 0; frame < decoded.length; frame++) {
                        channelData[frame] = decoded.audioData[frame * decoded.channels + ch];
                    }
                }

                audioBuffer._updateInternalBuffer();

                if (successCallback) {
                    successCallback(audioBuffer);
                }
                return audioBuffer;
            } catch (error) {
                if (errorCallback) {
                    errorCallback(error);
                }
                throw error;
            }
        }
    };

    return {
        OfflineAudioContext: IsolatedOfflineAudioContext,
        AudioContext: IsolatedAudioContext
    };
}
