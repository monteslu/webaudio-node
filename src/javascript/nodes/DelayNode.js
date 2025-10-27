import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class DelayNode extends AudioNode {
    constructor(context, maxDelayTime = 1.0) {
        const nodeId = context._engine.createNode('delay', { maxDelayTime });
        super(context, nodeId);

        this.numberOfInputs = 1;
        this.numberOfOutputs = 1;

        this.delayTime = new AudioParam(context, nodeId, 'delayTime', 0.0, 0.0, maxDelayTime);
    }
}
