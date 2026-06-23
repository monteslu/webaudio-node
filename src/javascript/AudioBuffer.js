let nextBufferId = 1;

export class AudioBuffer {
    constructor(options) {
        const { length, numberOfChannels, sampleRate } = options;

        this.length = length;
        this.numberOfChannels = numberOfChannels;
        this.sampleRate = sampleRate;
        this.duration = length / sampleRate;

        // Unique buffer ID for sharing
        this._id = nextBufferId++;

        // Internal buffer storage (Float32 interleaved). _channels (the
        // de-interleaved per-channel views) are allocated LAZILY — building them
        // up front is a giant per-sample loop, and most decoded buffers (music,
        // SFX) are only ever played, never read via getChannelData(). See
        // _ensureChannels().
        this._buffer = null;
        this._channels = null;
    }

    // Allocate + fill the de-interleaved per-channel arrays on demand. Cheap to
    // skip entirely for decode→play; only paid when a game actually reads samples.
    _ensureChannels() {
        if (this._channels) return;
        this._channels = [];
        for (let i = 0; i < this.numberOfChannels; i++) {
            this._channels.push(new Float32Array(this.length));
        }
        // If we were created from a pre-interleaved buffer (decodeAudioData),
        // de-interleave it into the channel views. Prefer the engine's native
        // (SIMD in WASM) deinterleave via the AudioBuffer._deinterleave hook the
        // platform layer installs; fall back to a JS loop if it isn't set.
        if (this._buffer) {
            const n = this.numberOfChannels;
            const frames = this.length;
            if (AudioBuffer._deinterleave) {
                // Native writes channel-concatenated planar [c0..., c1..., ...];
                // copy each channel slice into its Float32Array view.
                const planar = new Float32Array(frames * n);
                AudioBuffer._deinterleave(this._buffer, planar, frames, n);
                for (let ch = 0; ch < n; ch++) {
                    this._channels[ch].set(planar.subarray(ch * frames, (ch + 1) * frames));
                }
            } else {
                for (let frame = 0; frame < frames; frame++) {
                    for (let ch = 0; ch < n; ch++) {
                        this._channels[ch][frame] = this._buffer[frame * n + ch];
                    }
                }
            }
        }
    }

    // Fast path for decoders: adopt an already-interleaved Float32Array as the
    // internal buffer directly, skipping the de-interleave + re-interleave loops
    // entirely. _channels stay lazy.
    _setInterleavedBuffer(interleaved) {
        this._buffer = interleaved;
    }

    getChannelData(channel) {
        if (channel < 0 || channel >= this.numberOfChannels) {
            throw new Error('Invalid channel index');
        }
        this._ensureChannels();
        return this._channels[channel];
    }

    copyFromChannel(destination, channelNumber, startInChannel = 0) {
        if (channelNumber < 0 || channelNumber >= this.numberOfChannels) {
            throw new Error('Invalid channel number');
        }
        this._ensureChannels();
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
        this._ensureChannels();
        const channel = this._channels[channelNumber];
        const len = Math.min(source.length, channel.length - startInChannel);

        for (let i = 0; i < len; i++) {
            channel[startInChannel + i] = source[i];
        }

        this._updateInternalBuffer();
    }

    _updateInternalBuffer() {
        // Re-interleave the per-channel views into _buffer for the native engine.
        // Only reached when the game wrote samples via copyToChannel / getChannelData
        // (i.e. _channels exist). Decoded buffers skip this entirely (they keep the
        // interleaved buffer the decoder produced — see _setInterleavedBuffer).
        if (!this._channels) return;
        const totalSamples = this.length * this.numberOfChannels;
        if (!this._buffer || this._buffer.length !== totalSamples) {
            this._buffer = new Float32Array(totalSamples);
        }
        for (let frame = 0; frame < this.length; frame++) {
            for (let ch = 0; ch < this.numberOfChannels; ch++) {
                this._buffer[frame * this.numberOfChannels + ch] = this._channels[ch][frame];
            }
        }
    }

    _getInterleavedData() {
        // Fast path: a decoder already handed us the interleaved buffer — return it
        // as-is (no per-sample loop). Otherwise build it from the channel views.
        if (this._buffer && !this._channels) return this._buffer;
        if (!this._buffer) {
            // No interleaved buffer yet: either channels were written, or this is an
            // empty buffer. Materialize channels (empty) then interleave.
            this._ensureChannels();
            this._updateInternalBuffer();
        }
        return this._buffer;
    }
}
