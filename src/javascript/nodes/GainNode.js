import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class GainNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('gain', options);
        super(context, nodeId);

        this.numberOfInputs = 1;
        this.numberOfOutputs = 1;

        // Apply options
        const gainValue = options.gain !== undefined ? options.gain : 1.0;
        this.gain = new AudioParam(context, nodeId, 'gain', gainValue, 0.0, 1000.0);

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined) this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }
}
