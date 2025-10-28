// Factory function to create a fresh WebAudio implementation with its own WASM instance
// This is useful for test isolation where each test needs a clean WASM heap

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

export async function createWebAudioInstance() {
    // Load WASM module factory
    const createUnifiedWebAudioModule = (await import(path.join(rootDir, 'dist', 'webaudio.mjs'))).default;

    // Create fresh WASM instance
    const wasmModule = await createUnifiedWebAudioModule();

    // Dynamically import and bind all classes to this WASM instance
    const { WasmOfflineAudioContext } = await import('./wasm-integration/WasmOfflineAudioContext.js');
    const { WasmAudioContext } = await import('./wasm-integration/WasmAudioContext.js');

    // Create wrapper classes that use this specific WASM instance
    class IsolatedOfflineAudioContext extends WasmOfflineAudioContext {
        constructor(...args) {
            super(...args);
            // Override the engine's WASM module
            this._engine.wasmModule = wasmModule;
        }

        async decodeAudioData(audioData, successCallback, errorCallback) {
            // Use the isolated WASM module for decoding
            const { WasmAudioDecoders } = await import('./wasm-integration/WasmAudioDecoders.js');
            try {
                const decoded = await WasmAudioDecoders.decode(wasmModule, audioData, this.sampleRate);

                const { AudioBuffer } = await import('./javascript/AudioBuffer.js');
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
    }

    class IsolatedAudioContext extends WasmAudioContext {
        constructor(...args) {
            super(...args);
            // Override the engine's WASM module
            this._engine.wasmModule = wasmModule;
        }

        async decodeAudioData(audioData, successCallback, errorCallback) {
            // Use the isolated WASM module for decoding
            const { WasmAudioDecoders } = await import('./wasm-integration/WasmAudioDecoders.js');
            try {
                const decoded = await WasmAudioDecoders.decode(wasmModule, audioData, this.sampleRate);

                const { AudioBuffer } = await import('./javascript/AudioBuffer.js');
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
    }

    return {
        OfflineAudioContext: IsolatedOfflineAudioContext,
        AudioContext: IsolatedAudioContext,
        wasmModule
    };
}
