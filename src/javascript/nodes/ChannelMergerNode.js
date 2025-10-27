import { AudioNode } from '../AudioNode.js';

export class ChannelMergerNode extends AudioNode {
    constructor(context, options = {}) {
        const numberOfInputs = options.numberOfInputs || context._channels || 6;
        const nodeId = context._engine.createNode('channelMerger', { numberOfInputs });
        super(context, nodeId);

        this.numberOfInputs = numberOfInputs;
    }
}
