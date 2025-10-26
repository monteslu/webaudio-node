// WASM-based AudioContext with SDL audio output
// Real-time audio playback using WASM AudioGraph

import { WasmAudioEngine } from './WasmAudioEngine.js';
import { AudioDestinationNode } from '../javascript/nodes/AudioDestinationNode.js';
import { GainNode } from '../javascript/nodes/GainNode.js';
import { OscillatorNode } from '../javascript/nodes/OscillatorNode.js';
import { AudioBufferSourceNode } from '../javascript/nodes/AudioBufferSourceNode.js';
import { BiquadFilterNode } from '../javascript/nodes/BiquadFilterNode.js';
import { AudioBuffer } from '../javascript/AudioBuffer.js';
import sdl from '@kmamal/sdl';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

export class WasmAudioContext {
    constructor(options = {}) {
        this.sampleRate = options.sampleRate || 44100;
        this._channels = options.numberOfChannels || 2;
        this._bufferSize = options.bufferSize || 128; // Web Audio quantum size

        // Create WASM audio engine (WASM is preloaded, so this is synchronous)
        this._engine = new WasmAudioEngine(
            this._channels,
            this._bufferSize * 1000, // length doesn't matter for real-time
            this.sampleRate
        );

        // Create destination node immediately
        const destNodeId = this._engine.createNode('destination');
        this.destination = new AudioDestinationNode(this, destNodeId);

        this.state = 'suspended';
        this._audioDevice = null;
        this._startTime = null;
    }

    get currentTime() {
        if (!this._startTime) return 0;
        return (Date.now() - this._startTime) / 1000.0;
    }

    // Node creation methods (synchronous - per WebAudio spec)
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

    async resume() {
        if (this.state === 'running') return;

        console.log('[WASM AudioContext] Opening SDL audio device...');
        console.log('  Sample rate:', this.sampleRate);
        console.log('  Channels:', this._channels);
        console.log('  Buffer size:', this._bufferSize);

        // Open SDL audio device
        this._audioDevice = sdl.audio.openDevice({
            type: 'playback',
            sampleRate: this.sampleRate,
            channels: this._channels,
            format: 'f32',
            buffered: this._bufferSize * 2, // Double buffer
        }, (samples) => {
            // SDL audio callback - fill the buffer with audio from WASM
            const frameCount = samples.length / this._channels;

            // Render audio using WASM engine
            this._engine.renderBlock(samples, frameCount);

            // Log peak amplitude every 0.5 seconds
            if (!this._lastLogTime || Date.now() - this._lastLogTime > 500) {
                let peak = 0;
                for (let i = 0; i < samples.length; i++) {
                    peak = Math.max(peak, Math.abs(samples[i]));
                }
                console.log(`[WASM Audio Callback] Time: ${this.currentTime.toFixed(2)}s, Peak: ${peak.toFixed(6)}`);
                this._lastLogTime = Date.now();
            }
        });

        console.log('[WASM AudioContext] SDL device opened, starting playback...');
        this._audioDevice.play();
        this._startTime = Date.now();
        this.state = 'running';
        console.log('[WASM AudioContext] Playback started');
    }

    async suspend() {
        if (this.state === 'suspended') return;

        if (this._audioDevice) {
            this._audioDevice.pause();
        }
        this.state = 'suspended';
    }

    async close() {
        if (this._audioDevice) {
            this._audioDevice.close();
            this._audioDevice = null;
        }

        if (this._engine) {
            this._engine.destroy();
        }

        this.state = 'closed';
    }

    createBuffer(numberOfChannels, length, sampleRate) {
        return new AudioBuffer({
            numberOfChannels,
            length,
            sampleRate
        });
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
}
