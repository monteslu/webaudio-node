import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class GainNode extends AudioNode {
	constructor(context) {
		const nodeId = context._engine.createNode('gain');
		super(context, nodeId);

		this.numberOfInputs = 1;
		this.numberOfOutputs = 1;

		this.gain = new AudioParam(context, nodeId, 'gain', 1.0, 0.0, 1000.0);
	}
}
