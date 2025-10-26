import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class DynamicsCompressorNode extends AudioNode {
	constructor(context, options = {}) {
		const nodeId = context._engine.createNode('dynamicsCompressor', options);
		super(context, nodeId);

		// AudioParams with Web Audio API defaults
		this.threshold = new AudioParam(context, nodeId, 'threshold', -24, -100, 0);
		this.knee = new AudioParam(context, nodeId, 'knee', 30, 0, 40);
		this.ratio = new AudioParam(context, nodeId, 'ratio', 12, 1, 20);
		this.attack = new AudioParam(context, nodeId, 'attack', 0.003, 0, 1);
		this.release = new AudioParam(context, nodeId, 'release', 0.25, 0, 1);

		// Set initial values from options if provided
		if (options.threshold !== undefined) this.threshold.value = options.threshold;
		if (options.knee !== undefined) this.knee.value = options.knee;
		if (options.ratio !== undefined) this.ratio.value = options.ratio;
		if (options.attack !== undefined) this.attack.value = options.attack;
		if (options.release !== undefined) this.release.value = options.release;
	}

	get reduction() {
		// TODO: Implement getReduction method in engine
		return this.context._engine.getCompressorReduction(this._nodeId);
	}
}
