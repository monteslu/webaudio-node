import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class GainNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('gain', options);
        super(context, nodeId);

        this.numberOfInputs = 1;
        this.numberOfOutputs = 1;

        // Apply options using destructuring defaults
        const { gain = 1.0, channelCount, channelCountMode, channelInterpretation } = options;
        this.gain = new AudioParam(context, nodeId, 'gain', gain, 0.0, 1000.0);

        // Apply channel config from options
        if (channelCount !== undefined) this.channelCount = channelCount;
        if (channelCountMode !== undefined) this.channelCountMode = channelCountMode;
        if (channelInterpretation !== undefined) this.channelInterpretation = channelInterpretation;
    }
}
