import { AudioNode } from '../AudioNode.js';

export class MediaStreamSourceNode extends AudioNode {
	constructor(context, options = {}) {
		const nodeId = context._engine.createNode('mediaStreamSource');
		super(context, nodeId);

		this.numberOfInputs = 0;
		this.numberOfOutputs = 1;

		this._deviceIndex = options.deviceIndex || 0;
		this._isCapturing = false;
	}

	async start() {
		if (this._isCapturing) {
			return false;
		}

		const success = this.context._engine.startAudioCapture(this._nodeId, this._deviceIndex);
		this._isCapturing = success;
		return success;
	}

	stop() {
		if (!this._isCapturing) {
			return;
		}

		this.context._engine.stopAudioCapture();
		this._isCapturing = false;
	}

	get isCapturing() {
		return this._isCapturing;
	}

	static async getInputDevices(context) {
		return context._engine.getInputDevices();
	}
}
