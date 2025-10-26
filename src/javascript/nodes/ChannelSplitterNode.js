import { AudioNode } from '../AudioNode.js';

export class ChannelSplitterNode extends AudioNode {
	constructor(context, options = {}) {
		const numberOfOutputs = options.numberOfOutputs || context._channels || 6;
		const nodeId = context._engine.createNode('channelSplitter', { numberOfOutputs });
		super(context, nodeId);

		this.numberOfOutputs = numberOfOutputs;
	}
}
