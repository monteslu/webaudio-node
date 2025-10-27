import { AudioNode } from '../AudioNode.js';

export class AudioDestinationNode extends AudioNode {
    constructor(context, nodeId) {
        super(context, nodeId);
        this.numberOfInputs = 1;
        this.numberOfOutputs = 0;
        this.maxChannelCount = context._channels;
    }
}
