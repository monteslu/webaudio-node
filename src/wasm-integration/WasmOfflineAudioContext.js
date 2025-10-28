// WASM-based OfflineAudioContext
// Drop-in replacement for native OfflineAudioContext using WASM

import { WasmAudioEngine } from './WasmAudioEngine.js';
import { AudioDestinationNode } from '../javascript/nodes/AudioDestinationNode.js';
import { GainNode } from '../javascript/nodes/GainNode.js';
import { OscillatorNode } from '../javascript/nodes/OscillatorNode.js';
import { AudioBufferSourceNode } from '../javascript/nodes/AudioBufferSourceNode.js';
import { BiquadFilterNode } from '../javascript/nodes/BiquadFilterNode.js';
import { DelayNode } from '../javascript/nodes/DelayNode.js';
import { WaveShaperNode } from '../javascript/nodes/WaveShaperNode.js';
import { ChannelMergerNode } from '../javascript/nodes/ChannelMergerNode.js';
import { ChannelSplitterNode } from '../javascript/nodes/ChannelSplitterNode.js';
import { ConvolverNode } from '../javascript/nodes/ConvolverNode.js';
import { DynamicsCompressorNode } from '../javascript/nodes/DynamicsCompressorNode.js';
import { StereoPannerNode } from '../javascript/nodes/StereoPannerNode.js';
import { AnalyserNode } from '../javascript/nodes/AnalyserNode.js';
import { IIRFilterNode } from '../javascript/nodes/IIRFilterNode.js';
import { PannerNode } from '../javascript/nodes/PannerNode.js';
import { ConstantSourceNode } from '../javascript/nodes/ConstantSourceNode.js';
import { AudioBuffer } from '../javascript/AudioBuffer.js';
import { AudioListener } from '../javascript/AudioListener.js';
import { PeriodicWave } from '../javascript/PeriodicWave.js';
import { WasmAudioDecoders } from './WasmAudioDecoders.js';

export class WasmOfflineAudioContext {
    constructor(options) {
        // Support both object and positional arguments
        let numberOfChannels, length, sampleRate;

        if (typeof options === 'object' && !Array.isArray(options)) {
            numberOfChannels = options.numberOfChannels || 2;
            length = options.length;
            sampleRate = options.sampleRate || 44100;
        } else {
            // Positional: new OfflineAudioContext(numberOfChannels, length, sampleRate)
            numberOfChannels = arguments[0];
            length = arguments[1];
            sampleRate = arguments[2];
        }

        if (typeof length !== 'number' || length <= 0) {
            throw new Error('length must be a positive number');
        }

        // Create WASM audio engine (WASM is preloaded, so this is synchronous)
        this._engine = new WasmAudioEngine(numberOfChannels, length, sampleRate);

        this.sampleRate = sampleRate;
        this.length = length;
        this._channels = numberOfChannels;

        // Create destination node immediately
        const destNodeId = this._engine.createNode('destination');
        this.destination = new AudioDestinationNode(this, destNodeId);

        // Create AudioListener (for PannerNode spatialization)
        this.listener = new AudioListener(this);

        this.state = 'suspended';
        this._rendering = false;
    }

    get currentTime() {
        // Offline context doesn't have real-time playback
        return 0;
    }

    // Node creation methods (synchronous per WebAudio spec)
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

    createWaveShaper(options) {
        return new WaveShaperNode(this, options);
    }

    createChannelMerger(options) {
        // Support legacy parameter for backward compatibility
        if (typeof options === 'number') {
            options = { numberOfInputs: options };
        }
        return new ChannelMergerNode(this, options);
    }

    createChannelSplitter(options) {
        // Support legacy parameter for backward compatibility
        if (typeof options === 'number') {
            options = { numberOfOutputs: options };
        }
        return new ChannelSplitterNode(this, options);
    }

    createConvolver(options) {
        return new ConvolverNode(this, options);
    }

    createDynamicsCompressor(options) {
        return new DynamicsCompressorNode(this, options);
    }

    createStereoPanner(options) {
        return new StereoPannerNode(this, options);
    }

    createAnalyser(options) {
        return new AnalyserNode(this, options);
    }

    createIIRFilter(feedforward, feedback) {
        // Support both legacy (feedforward, feedback) and options object
        const options = typeof feedforward === 'object' && !Array.isArray(feedforward)
            ? feedforward
            : { feedforward, feedback };
        return new IIRFilterNode(this, options);
    }

    createPanner(options) {
        return new PannerNode(this, options);
    }

    createConstantSource(options) {
        return new ConstantSourceNode(this, options);
    }

    createBuffer(numberOfChannels, length, sampleRate) {
        return new AudioBuffer({ numberOfChannels, length, sampleRate });
    }

    createPeriodicWave(real, imag, options = {}) {
        return new PeriodicWave(this, { real, imag, ...options });
    }

    async startRendering() {
        if (this._rendering) {
            throw new Error('Rendering is already in progress');
        }

        this._rendering = true;
        this.state = 'running';

        try {
            // Render audio using WASM engine
            const audioData = await this._engine.render();

            // Create AudioBuffer with the rendered data
            const audioBuffer = new AudioBuffer({
                length: this.length,
                numberOfChannels: this._channels,
                sampleRate: this.sampleRate
            });

            // De-interleave the audio data into separate channels
            for (let channel = 0; channel < this._channels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);
                for (let frame = 0; frame < this.length; frame++) {
                    channelData[frame] = audioData[frame * this._channels + channel];
                }
            }

            this.state = 'closed';
            this._rendering = false;

            return audioBuffer;
        } catch (error) {
            this._rendering = false;
            this.state = 'suspended';
            throw error;
        }
    }

    // Alias for compatibility
    async resume() {
        return this.startRendering();
    }

    async decodeAudioData(audioData, successCallback, errorCallback) {
        try {
            // Decode using WASM decoders and resample to context's sample rate
            // This matches Web Audio API spec behavior
            const decoded = await WasmAudioDecoders.decode(audioData, this.sampleRate);

            // Create AudioBuffer with decoded data at context's sample rate
            const audioBuffer = new AudioBuffer({
                length: decoded.length,
                numberOfChannels: decoded.channels,
                sampleRate: this.sampleRate
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

    // Cleanup
    close() {
        if (this._engine) {
            this._engine.destroy();
        }
        this.state = 'closed';
    }
}
