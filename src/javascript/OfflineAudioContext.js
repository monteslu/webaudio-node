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
import { AudioBuffer } from './AudioBuffer.js';
import { PeriodicWave } from './PeriodicWave.js';
import { AudioListener } from './AudioListener.js';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

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

export class OfflineAudioContext {
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

		// Create native offline audio engine
		this._engine = new native.OfflineAudioEngine(numberOfChannels, length, sampleRate);

		this.sampleRate = sampleRate;
		this.length = length;
		this._channels = numberOfChannels;

		// Create destination node
		const destNodeId = this._engine.createNode('destination');
		this.destination = new AudioDestinationNode(this, destNodeId);

		// Create audio listener for spatial audio
		this.listener = new AudioListener(this);

		this.state = 'suspended';
		this._rendering = false;
	}

	get currentTime() {
		// Offline context doesn't have real-time playback
		return 0;
	}

	// Node creation methods (same as AudioContext)
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

	createDelay(maxDelayTime = 1.0) {
		return new DelayNode(this, maxDelayTime);
	}

	createStereoPanner() {
		return new StereoPannerNode(this);
	}

	createConstantSource() {
		return new ConstantSourceNode(this);
	}

	createChannelSplitter(numberOfOutputs) {
		return new ChannelSplitterNode(this, { numberOfOutputs });
	}

	createChannelMerger(numberOfInputs) {
		return new ChannelMergerNode(this, { numberOfInputs });
	}

	createAnalyser() {
		return new AnalyserNode(this);
	}

	createDynamicsCompressor() {
		return new DynamicsCompressorNode(this);
	}

	createWaveShaper() {
		return new WaveShaperNode(this);
	}

	createIIRFilter(feedforward, feedback) {
		return new IIRFilterNode(this, { feedforward, feedback });
	}

	createConvolver(options) {
		return new ConvolverNode(this, options);
	}

	createPanner() {
		return new PannerNode(this);
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

	// Main rendering method
	async startRendering() {
		if (this._rendering) {
			throw new Error('Rendering already in progress');
		}

		this._rendering = true;
		this.state = 'running';

		// Call native rendering method
		const renderedData = this._engine.startRendering();

		// Create AudioBuffer from rendered data
		const buffer = new AudioBuffer({
			length: this.length,
			numberOfChannels: this._channels,
			sampleRate: this.sampleRate
		});

		// Copy rendered data to buffer channels
		for (let channel = 0; channel < this._channels; channel++) {
			const channelData = buffer.getChannelData(channel);
			for (let i = 0; i < this.length; i++) {
				channelData[i] = renderedData[i * this._channels + channel];
			}
		}

		this.state = 'closed';
		this._rendering = false;

		return buffer;
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

	// These methods don't apply to offline context but included for compatibility
	async resume() {
		throw new Error('resume() is not supported on OfflineAudioContext');
	}

	async suspend() {
		throw new Error('suspend() is not supported on OfflineAudioContext');
	}

	async close() {
		// Already happens after startRendering
		this.state = 'closed';
		return Promise.resolve();
	}
}
