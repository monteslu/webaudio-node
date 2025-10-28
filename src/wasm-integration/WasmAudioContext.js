// WASM-based AudioContext with SDL audio output
// Real-time audio playback using WASM AudioGraph

import { WasmAudioEngine } from './WasmAudioEngine.js';
import { AudioDestinationNode } from '../javascript/nodes/AudioDestinationNode.js';
import { GainNode } from '../javascript/nodes/GainNode.js';
import { OscillatorNode } from '../javascript/nodes/OscillatorNode.js';
import { AudioBufferSourceNode } from '../javascript/nodes/AudioBufferSourceNode.js';
import { BiquadFilterNode } from '../javascript/nodes/BiquadFilterNode.js';
import { DelayNode } from '../javascript/nodes/DelayNode.js';
import { WaveShaperNode } from '../javascript/nodes/WaveShaperNode.js';
import { StereoPannerNode } from '../javascript/nodes/StereoPannerNode.js';
import { ConstantSourceNode } from '../javascript/nodes/ConstantSourceNode.js';
import { ConvolverNode } from '../javascript/nodes/ConvolverNode.js';
import { DynamicsCompressorNode } from '../javascript/nodes/DynamicsCompressorNode.js';
import { AnalyserNode } from '../javascript/nodes/AnalyserNode.js';
import { PannerNode } from '../javascript/nodes/PannerNode.js';
import { IIRFilterNode } from '../javascript/nodes/IIRFilterNode.js';
import { ChannelSplitterNode } from '../javascript/nodes/ChannelSplitterNode.js';
import { ChannelMergerNode } from '../javascript/nodes/ChannelMergerNode.js';
import { AudioBuffer } from '../javascript/AudioBuffer.js';
import { PeriodicWave } from '../javascript/PeriodicWave.js';
import { WasmAudioDecoders } from './WasmAudioDecoders.js';
import { MediaStreamSourceNode } from './MediaStreamSourceNode.js';
import sdl from '@kmamal/sdl';

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

export class WasmAudioContext {
    constructor(options = {}) {
        // Detect system default sample rate if not specified (matches browser behavior)
        let defaultSampleRate = 44100; // Fallback default
        if (!options.sampleRate) {
            try {
                // Open a temporary device to detect system sample rate
                const tempDevice = sdl.audio.openDevice({ type: 'playback' });
                defaultSampleRate = tempDevice.frequency || 44100;
                tempDevice.close();
            } catch (err) {
                // Fallback to 44100 if detection fails
                console.warn('Could not detect system sample rate, using 44100 Hz:', err.message);
            }
        }

        this.sampleRate = options.sampleRate || defaultSampleRate;
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

    // Helper method to find SDL device by deviceId
    _findDeviceBySinkId(sinkId) {
        try {
            // If no sinkId specified, return just the type to use SDL's default device
            if (!sinkId || sinkId === '') {
                return { type: 'playback' }; // SDL will use system default
            }

            // Find specific device by sinkId
            const devices = sdl.audio.devices || [];
            for (const device of devices) {
                if (hashString(device.name) === sinkId) {
                    return device;
                }
            }
            throw new Error(`Audio device not found: ${sinkId}`);
        } catch (error) {
            throw new Error(`Failed to find audio device: ${error.message}`);
        }
    }

    // Browser-compatible setSinkId method
    async setSinkId(sinkId) {
        // Validate device exists
        if (sinkId && sinkId !== '') {
            this._findDeviceBySinkId(sinkId); // Will throw if not found
        }

        const wasRunning = this.state === 'running';

        // If already running, we need to close and re-open with new device
        if (wasRunning) {
            // Save current time to maintain continuity
            const savedTime = this.currentTime;

            // Close old device
            if (this._audioDevice) {
                this._audioDevice.close();
                this._audioDevice = null;
            }

            // Update sink ID
            this._sinkId = sinkId;

            // Re-open with new device
            const device = this._findDeviceBySinkId(sinkId);
            this._audioDevice = sdl.audio.openDevice(device, {
                type: 'playback',
                frequency: this.sampleRate,
                channels: this._channels,
                format: 'f32',
                buffered: 65536 // Power of 2 buffer size (2^16 bytes)
            });

            // Restore timing (approximate)
            this._startTime = Date.now() - savedTime * 1000;

            // Sync WASM timing to restored time (WASM will auto-increment from here)
            this._engine.setCurrentTime(savedTime);

            // Pre-render and start playback
            this._renderAndEnqueueChunk(this.sampleRate * 2);
            this._audioDevice.play();
        } else {
            // Just update the sink ID for next resume()
            this._sinkId = sinkId;
        }
    }

    get currentTime() {
        if (!this._startTime) return 0;
        return (Date.now() - this._startTime) / 1000.0;
    }

    // Node creation methods (synchronous - per WebAudio spec)
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

    createDelay(maxDelayTime) {
        // Support legacy parameter or options object
        const options = typeof maxDelayTime === 'number'
            ? { maxDelayTime }
            : maxDelayTime;
        return new DelayNode(this, options);
    }

    createWaveShaper(options) {
        return new WaveShaperNode(this, options);
    }

    createStereoPanner(options) {
        return new StereoPannerNode(this, options);
    }

    createConstantSource(options) {
        return new ConstantSourceNode(this, options);
    }

    createConvolver(options) {
        return new ConvolverNode(this, options);
    }

    createDynamicsCompressor(options) {
        return new DynamicsCompressorNode(this, options);
    }

    createAnalyser(options) {
        return new AnalyserNode(this, options);
    }

    createPanner(options) {
        return new PannerNode(this, options);
    }

    createIIRFilter(feedforward, feedback) {
        return new IIRFilterNode(this, { feedforward, feedback });
    }

    createChannelSplitter(numberOfOutputs) {
        // Support legacy parameter or options object
        const options = typeof numberOfOutputs === 'number'
            ? { numberOfOutputs }
            : numberOfOutputs;
        return new ChannelSplitterNode(this, options);
    }

    createChannelMerger(numberOfInputs) {
        // Support legacy parameter or options object
        const options = typeof numberOfInputs === 'number'
            ? { numberOfInputs }
            : numberOfInputs;
        return new ChannelMergerNode(this, options);
    }

    createPeriodicWave(real, imag, options) {
        return new PeriodicWave(this, { real, imag, ...options });
    }

    createMediaStreamSource(options) {
        return new MediaStreamSourceNode(this, options);
    }

    async resume() {
        if (this.state === 'running') return;

        // Get the device to use (null for default, or specific device from sinkId)
        const device = this._findDeviceBySinkId(this._sinkId);

        // Open SDL audio device (queue-based, not callback-based)
        // Note: buffered must be a power of 2
        this._audioDevice = sdl.audio.openDevice(device, {
            type: 'playback',
            frequency: this.sampleRate,
            channels: this._channels,
            format: 'f32',
            buffered: 65536 // Power of 2 buffer size (2^16 bytes)
        });

        this._startTime = Date.now();
        this.state = 'running';

        // Pre-allocate reusable buffer for rendering (avoid allocations in hot path)
        const maxChunkFrames = Math.ceil(this.sampleRate * 0.2); // 200ms max chunks
        this._renderBuffer = new Float32Array(maxChunkFrames * this._channels);
        this._renderBufferAsBuffer = Buffer.from(this._renderBuffer.buffer);

        // Pre-render initial chunk (200ms) before starting playback
        this._renderAndEnqueueChunk(Math.ceil(this.sampleRate * 0.2));

        // Start playback
        this._audioDevice.play();

        // Start monitoring loop to render more chunks as needed
        this._monitorLoop();
    }

    _renderAndEnqueueChunk(numFrames) {
        // Reuse pre-allocated buffer (no allocation in hot path!)
        const totalSamples = numFrames * this._channels;
        const floatBuffer = this._renderBuffer.subarray(0, totalSamples);

        // Render audio using WASM engine (time auto-increments in WASM)
        this._engine.renderBlock(floatBuffer, numFrames);

        // Use pre-allocated Buffer view (no copy!)
        const buffer = this._renderBufferAsBuffer.subarray(0, totalSamples * 4);

        // Enqueue audio data to SDL
        this._audioDevice.enqueue(buffer);
    }

    _monitorLoop() {
        if (this.state !== 'running') return;

        // Check how much audio is queued
        const queuedBytes = this._audioDevice.queued;
        const queuedSeconds = queuedBytes / (this.sampleRate * this._channels * 4);

        // Keep buffer at 150-250ms for stability without too much latency
        if (queuedSeconds < 0.2) {
            // Render 32ms chunks (slightly larger than browser quantum size)
            const framesToRender = Math.ceil(this.sampleRate * 0.032);
            this._renderAndEnqueueChunk(framesToRender);
        }

        // Check every 10ms - good balance
        setTimeout(() => this._monitorLoop(), 10);
    }

    async suspend() {
        if (this.state === 'suspended') return;

        this.state = 'suspended';
        if (this._audioDevice) {
            this._audioDevice.pause();
        }
    }

    async close() {
        this.state = 'closed';

        if (this._audioDevice) {
            this._audioDevice.close();
            this._audioDevice = null;
        }

        if (this._engine) {
            this._engine.destroy();
        }
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
}
