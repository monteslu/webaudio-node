import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class StereoPannerNode extends AudioNode {
	constructor(context) {
		const nodeId = context._engine.createNode('stereoPanner');
		super(context, nodeId);

		this.numberOfInputs = 1;
		this.numberOfOutputs = 1;

		// Simple stereo panner (-1 = left, 1 = right)
		this.pan = new AudioParam(context, nodeId, 'pan', 0.0, -1.0, 1.0);
	}
}
