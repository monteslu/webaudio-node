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

export class AudioContext {
	constructor(options = {}) {
		const {
			sampleRate = 44100,
			channels = 2,
			bufferSize = 512
		} = options;

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
