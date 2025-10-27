import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';
import { AudioDestinationNode } from './nodes/AudioDestinationNode.js';
import { AudioBufferSourceNode } from './nodes/AudioBufferSourceNode.js';
import { GainNode } from './nodes/GainNode.js';
import { OscillatorNode } from './nodes/OscillatorNode.js';
import { BiquadFilterNode } from './nodes/BiquadFilterNode.js';
import { DelayNode } from './nodes/DelayNode.js';
import { StereoPannerNode } from './nodes/StereoPannerNode.js';
import { ConstantSourceNode } from './nodes/ConstantSourceNode.js';
import { ChannelSplitterNode } from './nodes/ChannelSplitterNode.js';
import { ChannelMergerNode } from './nodes/ChannelMergerNode.js';
import { AnalyserNode } from './nodes/AnalyserNode.js';
import { DynamicsCompressorNode } from './nodes/DynamicsCompressorNode.js';
import { WaveShaperNode } from './nodes/WaveShaperNode.js';
import { IIRFilterNode } from './nodes/IIRFilterNode.js';
import { ConvolverNode } from './nodes/ConvolverNode.js';
import { PannerNode } from './nodes/PannerNode.js';
import { AudioWorkletNode } from './nodes/AudioWorkletNode.js';
import { MediaStreamSourceNode } from './nodes/MediaStreamSourceNode.js';
import { AudioBuffer } from './AudioBuffer.js';
import { PeriodicWave } from './PeriodicWave.js';
import { AudioListener } from './AudioListener.js';
import sdl from '@kmamal/sdl';
import { WasmAudioDecoders } from '../wasm-integration/WasmAudioDecoders.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

// Load native addon
let native;
try {
    native = require(path.join(rootDir, 'build', 'Release', 'webaudio_native.node'));
} catch (error) {
    throw new Error(`Failed to load native addon: ${error.message}`);
}

// Simple hash function for generating stable device IDs
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

export class AudioContext {
    constructor(options = {}) {
        const { sampleRate = 44100, channels = 2, bufferSize = 512 } = options;

        // Create native audio engine
        this._engine = new native.AudioEngine({
            sampleRate,
            channels,
            bufferSize
        });

        this.sampleRate = this._engine.getSampleRate();
        this._channels = channels;
        this._format = 'f32';

        // Create destination node
        const destNodeId = this._engine.createNode('destination');
        this.destination = new AudioDestinationNode(this, destNodeId);

        // Create audio listener for spatial audio
        this.listener = new AudioListener(this);

        this.state = 'suspended';
        this._sinkId = ''; // Empty string means default device (browser-compatible)
    }

    // Browser-compatible sinkId property
    get sinkId() {
        return this._sinkId;
    }

    // Static method to enumerate audio devices (browser-compatible API)
    // Returns both audioinput and audiooutput devices
    static enumerateDevices() {
        try {
            const devices = sdl.audio.devices || [];
            return devices.map(device => ({
                deviceId: hashString(device.name),
                kind: device.type === 'recording' ? 'audioinput' : 'audiooutput',
                label: device.name,
                groupId: '' // SDL doesn't provide group information
            }));
        } catch (error) {
            console.warn('Failed to enumerate audio devices:', error);
            return [];
        }
    }

    // Browser-compatible setSinkId method
    async setSinkId(sinkId) {
        // Note: The native C++ AudioContext doesn't support device switching yet
        // This method is provided for API compatibility but will warn if used
        console.warn('AudioContext.setSinkId() is not yet implemented for native C++ backend');
        console.warn('Device switching is only supported in WASM-based AudioContext');
        this._sinkId = sinkId;
        // TODO: Implement device switching in native C++ backend
    }

    get currentTime() {
        return this._engine.getCurrentTime();
    }

    async resume() {
        this._engine.resume();
        this.state = 'running';
        return Promise.resolve();
    }

    async suspend() {
        this._engine.suspend();
        this.state = 'suspended';
        return Promise.resolve();
    }

    async close() {
        this._engine.close();
        this.state = 'closed';
        return Promise.resolve();
    }

    createOscillator(options) {
        return new OscillatorNode(this, options);
    }

    createGain(options) {
        return new GainNode(this, options);
    }

    createBufferSource(options) {
        return new AudioBufferSourceNode(this, options);
    }

    createBiquadFilter(options) {
        return new BiquadFilterNode(this, options);
    }

    createDelay(options) {
        // Support legacy parameter for backward compatibility
        if (typeof options === 'number') {
            options = { maxDelayTime: options };
        }
        return new DelayNode(this, options);
    }

    createStereoPanner(options) {
        return new StereoPannerNode(this, options);
    }

    createConstantSource(options) {
        return new ConstantSourceNode(this, options);
    }

    createChannelSplitter(options) {
        // Support legacy parameter for backward compatibility
        if (typeof options === 'number') {
            options = { numberOfOutputs: options };
        }
        return new ChannelSplitterNode(this, options);
    }

    createChannelMerger(options) {
        // Support legacy parameter for backward compatibility
        if (typeof options === 'number') {
            options = { numberOfInputs: options };
        }
        return new ChannelMergerNode(this, options);
    }

    createAnalyser(options) {
        return new AnalyserNode(this, options);
    }

    createDynamicsCompressor(options) {
        return new DynamicsCompressorNode(this, options);
    }

    createWaveShaper(options) {
        return new WaveShaperNode(this, options);
    }

    createIIRFilter(options) {
        // IIRFilter already requires options with feedforward/feedback
        return new IIRFilterNode(this, options);
    }

    createConvolver(options) {
        return new ConvolverNode(this, options);
    }

    createPanner(options) {
        return new PannerNode(this, options);
    }

    createAudioWorklet(processorName, options) {
        return new AudioWorkletNode(this, processorName, options);
    }

    createMediaStreamSource(options) {
        return new MediaStreamSourceNode(this, options);
    }

    async getInputDevices() {
        return MediaStreamSourceNode.getInputDevices(this);
    }

    createBuffer(numberOfChannels, length, sampleRate) {
        return new AudioBuffer({
            length,
            numberOfChannels,
            sampleRate: sampleRate || this.sampleRate
        });
    }

    createPeriodicWave(real, imag, options = {}) {
        return new PeriodicWave(this, { real, imag, ...options });
    }

    async decodeAudioData(audioData, successCallback, errorCallback) {
        try {
            // Decode using WASM decoders (MP3, WAV, FLAC, OGG, AAC)
            const decoded = await WasmAudioDecoders.decode(audioData);

            // Create AudioBuffer with decoded data
            const audioBuffer = new AudioBuffer({
                length: decoded.length,
                numberOfChannels: decoded.channels,
                sampleRate: decoded.sampleRate
            });

            // De-interleave audio data into separate channels
            for (let ch = 0; ch < decoded.channels; ch++) {
                const channelData = audioBuffer._channels[ch];
                for (let frame = 0; frame < decoded.length; frame++) {
                    channelData[frame] = decoded.audioData[frame * decoded.channels + ch];
                }
            }

            // Regenerate interleaved buffer from channels
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
