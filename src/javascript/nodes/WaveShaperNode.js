import { AudioNode } from '../AudioNode.js';

export class WaveShaperNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('waveShaper', options);
        super(context, nodeId);

        this._curve = null;
        this._oversample = options.oversample || 'none';

        if (options.curve) {
            this.curve = options.curve;
        }

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined)
            this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }

    get curve() {
        return this._curve;
    }

    set curve(value) {
        if (value === null || value === undefined) {
            this._curve = null;
            this.context._engine.clearWaveShaperCurve(this._nodeId);
            return;
        }

        if (!(value instanceof Float32Array)) {
            throw new TypeError('curve must be a Float32Array or null');
        }

        if (value.length < 2) {
            throw new Error('curve length must be at least 2');
        }

        this._curve = new Float32Array(value);
        this.context._engine.setWaveShaperCurve(this._nodeId, this._curve);
    }

    get oversample() {
        return this._oversample;
    }

    set oversample(value) {
        const validValues = ['none', '2x', '4x'];
        if (!validValues.includes(value)) {
            throw new TypeError('oversample must be "none", "2x", or "4x"');
        }
        this._oversample = value;
        this.context._engine.setWaveShaperOversample(this._nodeId, value);
    }
}
