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
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

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
    createOscillator() {
        return new OscillatorNode(this);
    }

    createGain() {
        return new GainNode(this);
    }

    createBufferSource() {
        return new AudioBufferSourceNode(this);
    }

    createBiquadFilter() {
        return new BiquadFilterNode(this);
    }

    createDelay(maxDelayTime) {
        return new DelayNode(this, { maxDelayTime });
    }

    createWaveShaper() {
        return new WaveShaperNode(this);
    }

    createChannelMerger(numberOfInputs) {
        return new ChannelMergerNode(this, { numberOfInputs });
    }

    createChannelSplitter(numberOfOutputs) {
        return new ChannelSplitterNode(this, { numberOfOutputs });
    }

    createConvolver() {
        return new ConvolverNode(this);
    }

    createDynamicsCompressor() {
        return new DynamicsCompressorNode(this);
    }

    createStereoPanner() {
        return new StereoPannerNode(this);
    }

    createAnalyser() {
        return new AnalyserNode(this);
    }

    createIIRFilter(feedforward, feedback) {
        return new IIRFilterNode(this, { feedforward, feedback });
    }

    createPanner() {
        return new PannerNode(this);
    }

    createConstantSource() {
        return new ConstantSourceNode(this);
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
                sampleRate: this.sampleRate,
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
            // Create input stream
            const inputStream = new Readable();
            inputStream.push(Buffer.from(audioData));
            inputStream.push(null);

            // Decode directly to memory using ffmpeg with fast decode options
            const chunks = [];
            await new Promise((resolve, reject) => {
                const stream = ffmpeg(inputStream)
                    .inputOptions([
                        '-threads 1',           // Single thread for small files (less overhead)
                        '-analyzeduration 0',   // Skip analysis phase
                        '-probesize 32'         // Minimal probing
                    ])
                    .toFormat('f32le')
                    .audioChannels(this._channels)
                    .audioFrequency(this.sampleRate)
                    .on('error', reject)
                    .stream();

                stream.on('data', chunk => chunks.push(chunk));
                stream.on('end', resolve);
                stream.on('error', reject);
            });

            // Combine chunks and create float array
            const buffer = Buffer.concat(chunks);
            const numSamples = (buffer.length / this._channels) / 4;

            const audioBuffer = new AudioBuffer({
                length: numSamples,
                numberOfChannels: this._channels,
                sampleRate: this.sampleRate
            });

            // Fast de-interleaving using TypedArray view (10-100x faster than readFloatLE)
            const floatView = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);

            for (let ch = 0; ch < this._channels; ch++) {
                const channelData = audioBuffer._channels[ch];
                for (let frame = 0; frame < numSamples; frame++) {
                    channelData[frame] = floatView[frame * this._channels + ch];
                }
            }

            // Regenerate interleaved buffer from channels
            // This ensures the buffer is in the exact format expected by the engine
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
