import { AudioNode } from '../AudioNode.js';

export class ChannelSplitterNode extends AudioNode {
    constructor(context, options = {}) {
        const numberOfOutputs = options.numberOfOutputs || context._channels || 6;
        const nodeId = context._engine.createNode('channelSplitter', {
            ...options,
            numberOfOutputs
        });
        super(context, nodeId);

        this.numberOfOutputs = numberOfOutputs;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined)
            this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }
}
