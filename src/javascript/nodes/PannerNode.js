import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class PannerNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('panner', options);
        super(context, nodeId);

        // Extract all options with defaults
        const {
            positionX = 0,
            positionY = 0,
            positionZ = 0,
            orientationX = 1,
            orientationY = 0,
            orientationZ = 0,
            distanceModel = 'inverse',
            refDistance = 1,
            maxDistance = 10000,
            rolloffFactor = 1,
            coneInnerAngle = 360,
            coneOuterAngle = 360,
            coneOuterGain = 0,
            panningModel = 'equalpower'
        } = options;

        // Position as AudioParams (Web Audio API spec)
        this.positionX = new AudioParam(context, nodeId, 'positionX', positionX);
        this.positionY = new AudioParam(context, nodeId, 'positionY', positionY);
        this.positionZ = new AudioParam(context, nodeId, 'positionZ', positionZ);

        // Orientation as AudioParams (Web Audio API spec)
        this.orientationX = new AudioParam(context, nodeId, 'orientationX', orientationX);
        this.orientationY = new AudioParam(context, nodeId, 'orientationY', orientationY);
        this.orientationZ = new AudioParam(context, nodeId, 'orientationZ', orientationZ);

        // Distance model
        this._distanceModel = distanceModel;
        this._refDistance = refDistance;
        this._maxDistance = maxDistance;
        this._rolloffFactor = rolloffFactor;

        // Cone
        this._coneInnerAngle = coneInnerAngle;
        this._coneOuterAngle = coneOuterAngle;
        this._coneOuterGain = coneOuterGain;

        // Panning model
        this._panningModel = panningModel;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined)
            this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
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
        this.positionX.value = x;
        this.positionY.value = y;
        this.positionZ.value = z;
    }

    setOrientation(x, y, z) {
        this.orientationX.value = x;
        this.orientationY.value = y;
        this.orientationZ.value = z;
    }
}
