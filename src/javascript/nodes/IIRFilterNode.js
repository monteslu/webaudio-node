import { AudioNode } from '../AudioNode.js';

export class IIRFilterNode extends AudioNode {
    constructor(context, options) {
        if (!options || !options.feedforward || !options.feedback) {
            throw new TypeError('IIRFilterNode requires feedforward and feedback coefficients');
        }

        if (options.feedforward.length === 0 || options.feedforward.length > 20) {
            throw new Error('feedforward must have length between 1 and 20');
        }

        if (options.feedback.length === 0 || options.feedback.length > 20) {
            throw new Error('feedback must have length between 1 and 20');
        }

        if (options.feedback[0] === 0) {
            throw new Error('feedback[0] cannot be 0');
        }

        const nodeId = context._engine.createNode('IIRFilter', {
            feedforward: Array.from(options.feedforward),
            feedback: Array.from(options.feedback)
        });
        super(context, nodeId);

        this._feedforward = Array.from(options.feedforward);
        this._feedback = Array.from(options.feedback);
    }

    getFrequencyResponse(frequencyHz, magResponse, phaseResponse) {
        if (!(frequencyHz instanceof Float32Array)) {
            throw new TypeError('frequencyHz must be a Float32Array');
        }
        if (!(magResponse instanceof Float32Array)) {
            throw new TypeError('magResponse must be a Float32Array');
        }
        if (!(phaseResponse instanceof Float32Array)) {
            throw new TypeError('phaseResponse must be a Float32Array');
        }

        if (frequencyHz.length !== magResponse.length || frequencyHz.length !== phaseResponse.length) {
            throw new Error('All arrays must have the same length');
        }

        this.context._engine.getIIRFilterFrequencyResponse(
            this._nodeId,
            frequencyHz,
            magResponse,
            phaseResponse
        );
    }
}
