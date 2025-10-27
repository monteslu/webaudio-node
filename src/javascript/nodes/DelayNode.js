import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class DelayNode extends AudioNode {
    constructor(context, options = {}) {
        const maxDelayTime = options.maxDelayTime !== undefined ? options.maxDelayTime : 1.0;
        const delayTime = options.delayTime !== undefined ? options.delayTime : 0.0;

        const nodeId = context._engine.createNode('delay', { ...options, maxDelayTime });
        super(context, nodeId);

        this.numberOfInputs = 1;
        this.numberOfOutputs = 1;

        this.delayTime = new AudioParam(context, nodeId, 'delayTime', delayTime, 0.0, maxDelayTime);

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined) this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }
}
