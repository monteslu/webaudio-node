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
		// Create interleaved buffer for native code
		const totalSamples = this.length * this.numberOfChannels;
		if (!this._buffer || this._buffer.length !== totalSamples * 4) {
			this._buffer = Buffer.allocUnsafe(totalSamples * 4);
		}

		// Interleave channels
		for (let frame = 0; frame < this.length; frame++) {
			for (let ch = 0; ch < this.numberOfChannels; ch++) {
				const value = this._channels[ch][frame];
				const offset = (frame * this.numberOfChannels + ch) * 4;
				this._buffer.writeFloatLE(value, offset);
			}
		}
	}

	_getInterleavedData() {
		if (!this._buffer) {
			this._updateInternalBuffer();
		}
		return this._buffer;
	}
}
