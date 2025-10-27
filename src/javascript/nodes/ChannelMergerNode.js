import { AudioNode } from '../AudioNode.js';

export class ChannelMergerNode extends AudioNode {
    constructor(context, options = {}) {
        const numberOfInputs = options.numberOfInputs || context._channels || 6;
        const nodeId = context._engine.createNode('channelMerger', { ...options, numberOfInputs });
        super(context, nodeId);

        this.numberOfInputs = numberOfInputs;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined) this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }
}
