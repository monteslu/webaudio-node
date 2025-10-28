import { AudioNode } from '../AudioNode.js';

export class ConvolverNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('convolver', options);
        super(context, nodeId);

        this._buffer = null;
        const { normalize = true } = options;
        this._normalize = normalize;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined)
            this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }

    get buffer() {
        return this._buffer;
    }

    set buffer(value) {
        if (value === null) {
            this._buffer = null;
            return;
        }

        if (!value || typeof value !== 'object' || !value.getChannelData) {
            throw new TypeError('ConvolverNode.buffer must be an AudioBuffer or null');
        }

        this._buffer = value;

        // Prepare interleaved buffer data for native code
        const length = value.length;
        const numberOfChannels = value.numberOfChannels;
        const interleavedData = new Float32Array(length * numberOfChannels);

        // Interleave channel data
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = value.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                interleavedData[i * numberOfChannels + channel] = channelData[i];
            }
        }

        // Send to native code
        this.context._engine.setNodeBuffer(
            this._nodeId,
            interleavedData,
            length,
            numberOfChannels
        );
    }

    get normalize() {
        return this._normalize;
    }

    set normalize(value) {
        this._normalize = Boolean(value);
        this.context._engine.setNodeProperty(this._nodeId, 'normalize', this._normalize);
    }
}
