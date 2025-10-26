let nextBufferId = 1;

export class AudioBuffer {
	constructor(options) {
		const {
			length,
			numberOfChannels,
			sampleRate
		} = options;

		this.length = length;
		this.numberOfChannels = numberOfChannels;
		this.sampleRate = sampleRate;
		this.duration = length / sampleRate;

		// Unique buffer ID for sharing
		this._id = nextBufferId++;

		// Internal buffer storage (Float32 interleaved)
		this._buffer = null;
		this._channels = [];

		// Initialize channel data
		for (let i = 0; i < numberOfChannels; i++) {
			this._channels.push(new Float32Array(length));
		}
	}

	getChannelData(channel) {
		if (channel < 0 || channel >= this.numberOfChannels) {
			throw new Error('Invalid channel index');
		}
		return this._channels[channel];
	}

	copyFromChannel(destination, channelNumber, startInChannel = 0) {
		if (channelNumber < 0 || channelNumber >= this.numberOfChannels) {
			throw new Error('Invalid channel number');
		}

		const channel = this._channels[channelNumber];
		const len = Math.min(destination.length, channel.length - startInChannel);

		for (let i = 0; i < len; i++) {
			destination[i] = channel[startInChannel + i];
		}
	}

	copyToChannel(source, channelNumber, startInChannel = 0) {
		if (channelNumber < 0 || channelNumber >= this.numberOfChannels) {
			throw new Error('Invalid channel number');
		}

		const channel = this._channels[channelNumber];
		const len = Math.min(source.length, channel.length - startInChannel);

		for (let i = 0; i < len; i++) {
			channel[startInChannel + i] = source[i];
		}

		this._updateInternalBuffer();
	}

	_updateInternalBuffer() {
		// Create interleaved buffer for native/WASM code
		const totalSamples = this.length * this.numberOfChannels;

		// Use Float32Array for compatibility with both Node and WASM
		if (!this._buffer || this._buffer.length !== totalSamples) {
			this._buffer = new Float32Array(totalSamples);
		}

		// Interleave channels
		for (let frame = 0; frame < this.length; frame++) {
			for (let ch = 0; ch < this.numberOfChannels; ch++) {
				const value = this._channels[ch][frame];
				const offset = frame * this.numberOfChannels + ch;
				this._buffer[offset] = value;
			}
		}
	}

	_getInterleavedData() {
		if (!this._buffer) {
			this._updateInternalBuffer();
		}
		// For Node Buffer compatibility, convert Float32Array to Buffer if needed
		if (typeof Buffer !== 'undefined' && !(this._buffer instanceof Buffer)) {
			// Keep as Float32Array for WASM, or could convert to Buffer for Node if needed
			return this._buffer;
		}
		return this._buffer;
	}
}
