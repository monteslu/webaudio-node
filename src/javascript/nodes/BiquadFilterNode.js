import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class BiquadFilterNode extends AudioNode {
    constructor(context, options = {}) {
        const type = options.type || 'lowpass';
        const nodeId = context._engine.createNode('biquadFilter', { ...options, type });
        super(context, nodeId);

        this.numberOfInputs = 1;
        this.numberOfOutputs = 1;

        // Apply options for AudioParams
        const freq = options.frequency !== undefined ? options.frequency : 350.0;
        const q = options.Q !== undefined ? options.Q : 1.0;
        const gainValue = options.gain !== undefined ? options.gain : 0.0;
        const det = options.detune !== undefined ? options.detune : 0.0;

        this.frequency = new AudioParam(context, nodeId, 'frequency', freq, 10.0, context.sampleRate / 2);
        this.Q = new AudioParam(context, nodeId, 'Q', q, 0.0001, 1000.0);
        this.gain = new AudioParam(context, nodeId, 'gain', gainValue, -40.0, 40.0);
        this.detune = new AudioParam(context, nodeId, 'detune', det, -1200, 1200);

        this._type = type;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined) this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        const validTypes = [
            'lowpass',
            'highpass',
            'bandpass',
            'lowshelf',
            'highshelf',
            'peaking',
            'notch',
            'allpass'
        ];
        if (!validTypes.includes(value)) {
            throw new Error(`Invalid filter type: ${value}`);
        }
        this._type = value;
        // Type is set during creation, would need to recreate node to change it
        // For now, just store it
    }

    getFrequencyResponse(_frequencyHz, _magResponse, _phaseResponse) {
        // TODO: Implement frequency response calculation
        throw new Error('getFrequencyResponse not yet implemented');
    }
}
