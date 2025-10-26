import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class AudioBufferSourceNode extends AudioNode {
	constructor(context) {
		const nodeId = context._engine.createNode('bufferSource');
		super(context, nodeId);

		this.buffer = null;
		this.playbackRate = new AudioParam(context, nodeId, 'playbackRate', 1.0, 0.0, 100.0);
		this.detune = new AudioParam(context, nodeId, 'detune', 0.0, -1200.0, 1200.0);
		this.loop = false;
		this.loopStart = 0;
		this.loopEnd = 0;
		this.onended = null;

		this._started = false;
		this._stopped = false;
	}

	start(when = 0, offset = 0, duration) {
		if (this._started) {
			throw new Error('Cannot call start more than once');
		}

		if (!this.buffer) {
			throw new Error('Cannot start without a buffer');
		}

		this._started = true;

		// Register buffer with engine if not already registered
		if (!this.context._registeredBuffers) {
			this.context._registeredBuffers = new Set();
		}

		if (!this.context._registeredBuffers.has(this.buffer._id)) {
			const bufferData = this.buffer._getInterleavedData();
			this.context._engine.registerBuffer(
				this.buffer._id,
				bufferData,
				this.buffer.length,
				this.buffer.numberOfChannels
			);
			this.context._registeredBuffers.add(this.buffer._id);
		}

		// Set buffer ID (not data) in native code
		this.context._engine.setNodeBufferId(this._nodeId, this.buffer._id);

		// Set loop parameters
		this.context._engine.setNodeParameter(this._nodeId, 'loop', this.loop ? 1.0 : 0.0);
		this.context._engine.setNodeParameter(this._nodeId, 'loopStart', this.loopStart);
		this.context._engine.setNodeParameter(this._nodeId, 'loopEnd', this.loopEnd);

		// Start node
		this.context._engine.startNode(this._nodeId, when);

		// Schedule end event
		if (this.onended && !this.loop) {
			const endTime = (when + this.buffer.duration) * 1000;
			setTimeout(() => {
				if (this.onended && !this._stopped) {
					this.onended({ target: this });
				}
			}, endTime);
		}
	}

	stop(when = 0) {
		if (!this._started || this._stopped) {
			return;
		}

		this._stopped = true;
		this.context._engine.stopNode(this._nodeId, when);
	}
}
