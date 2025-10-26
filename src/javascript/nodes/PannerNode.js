import { AudioNode } from '../AudioNode.js';

export class PannerNode extends AudioNode {
	constructor(context, options = {}) {
		const nodeId = context._engine.createNode('panner', options);
		super(context, nodeId);

		// Position
		this._positionX = options.positionX !== undefined ? options.positionX : 0;
		this._positionY = options.positionY !== undefined ? options.positionY : 0;
		this._positionZ = options.positionZ !== undefined ? options.positionZ : 0;

		// Orientation
		this._orientationX = options.orientationX !== undefined ? options.orientationX : 1;
		this._orientationY = options.orientationY !== undefined ? options.orientationY : 0;
		this._orientationZ = options.orientationZ !== undefined ? options.orientationZ : 0;

		// Distance model
		this._distanceModel = options.distanceModel || 'inverse';
		this._refDistance = options.refDistance !== undefined ? options.refDistance : 1;
		this._maxDistance = options.maxDistance !== undefined ? options.maxDistance : 10000;
		this._rolloffFactor = options.rolloffFactor !== undefined ? options.rolloffFactor : 1;

		// Cone
		this._coneInnerAngle = options.coneInnerAngle !== undefined ? options.coneInnerAngle : 360;
		this._coneOuterAngle = options.coneOuterAngle !== undefined ? options.coneOuterAngle : 360;
		this._coneOuterGain = options.coneOuterGain !== undefined ? options.coneOuterGain : 0;

		// Panning model
		this._panningModel = options.panningModel || 'equalpower';
	}

	// Position getters/setters
	get positionX() {
		return this._positionX;
	}

	set positionX(value) {
		this._positionX = value;
		this.context._engine.setNodeParameter(this._nodeId, 'positionX', value);
	}

	get positionY() {
		return this._positionY;
	}

	set positionY(value) {
		this._positionY = value;
		this.context._engine.setNodeParameter(this._nodeId, 'positionY', value);
	}

	get positionZ() {
		return this._positionZ;
	}

	set positionZ(value) {
		this._positionZ = value;
		this.context._engine.setNodeParameter(this._nodeId, 'positionZ', value);
	}

	// Orientation getters/setters
	get orientationX() {
		return this._orientationX;
	}

	set orientationX(value) {
		this._orientationX = value;
		this.context._engine.setNodeParameter(this._nodeId, 'orientationX', value);
	}

	get orientationY() {
		return this._orientationY;
	}

	set orientationY(value) {
		this._orientationY = value;
		this.context._engine.setNodeParameter(this._nodeId, 'orientationY', value);
	}

	get orientationZ() {
		return this._orientationZ;
	}

	set orientationZ(value) {
		this._orientationZ = value;
		this.context._engine.setNodeParameter(this._nodeId, 'orientationZ', value);
	}

	// Distance model
	get distanceModel() {
		return this._distanceModel;
	}

	set distanceModel(value) {
		const validModels = ['linear', 'inverse', 'exponential'];
		if (!validModels.includes(value)) {
			throw new TypeError('distanceModel must be "linear", "inverse", or "exponential"');
		}
		this._distanceModel = value;
		this.context._engine.setNodeStringProperty(this._nodeId, 'distanceModel', value);
	}

	get refDistance() {
		return this._refDistance;
	}

	set refDistance(value) {
		this._refDistance = value;
		this.context._engine.setNodeParameter(this._nodeId, 'refDistance', value);
	}

	get maxDistance() {
		return this._maxDistance;
	}

	set maxDistance(value) {
		this._maxDistance = value;
		this.context._engine.setNodeParameter(this._nodeId, 'maxDistance', value);
	}

	get rolloffFactor() {
		return this._rolloffFactor;
	}

	set rolloffFactor(value) {
		this._rolloffFactor = value;
		this.context._engine.setNodeParameter(this._nodeId, 'rolloffFactor', value);
	}

	// Cone
	get coneInnerAngle() {
		return this._coneInnerAngle;
	}

	set coneInnerAngle(value) {
		this._coneInnerAngle = value;
		this.context._engine.setNodeParameter(this._nodeId, 'coneInnerAngle', value);
	}

	get coneOuterAngle() {
		return this._coneOuterAngle;
	}

	set coneOuterAngle(value) {
		this._coneOuterAngle = value;
		this.context._engine.setNodeParameter(this._nodeId, 'coneOuterAngle', value);
	}

	get coneOuterGain() {
		return this._coneOuterGain;
	}

	set coneOuterGain(value) {
		this._coneOuterGain = value;
		this.context._engine.setNodeParameter(this._nodeId, 'coneOuterGain', value);
	}

	// Panning model
	get panningModel() {
		return this._panningModel;
	}

	set panningModel(value) {
		const validModels = ['equalpower', 'HRTF'];
		if (!validModels.includes(value)) {
			throw new TypeError('panningModel must be "equalpower" or "HRTF"');
		}
		this._panningModel = value;
		this.context._engine.setNodeStringProperty(this._nodeId, 'panningModel', value);
	}

	// Legacy methods (for compatibility)
	setPosition(x, y, z) {
		this.positionX = x;
		this.positionY = y;
		this.positionZ = z;
	}

	setOrientation(x, y, z) {
		this.orientationX = x;
		this.orientationY = y;
		this.orientationZ = z;
	}
}
