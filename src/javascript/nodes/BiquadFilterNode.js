import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class BiquadFilterNode extends AudioNode {
    constructor(context) {
        const nodeId = context._engine.createNode('biquadFilter', { type: 'lowpass' });
        super(context, nodeId);

        this.numberOfInputs = 1;
        this.numberOfOutputs = 1;

        this.frequency = new AudioParam(context, nodeId, 'frequency', 350.0, 10.0, context.sampleRate / 2);
        this.Q = new AudioParam(context, nodeId, 'Q', 1.0, 0.0001, 1000.0);
        this.gain = new AudioParam(context, nodeId, 'gain', 0.0, -40.0, 40.0);

        this._type = 'lowpass';
    }

    get type() {
        return this._type;
    }

    set type(value) {
        const validTypes = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];
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
