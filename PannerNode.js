import { AudioNode } from './AudioNode.js';
import { AudioParam } from './AudioParam.js';


export class PannerNode extends AudioNode {
  constructor(context, options = {}) {
    super(context, options);
    
    this.numberOfInputs = 1;
    
    this.panningModel = options.panningModel || "equalpower";
    this.distanceModel = options.distanceModel || "inverse";
    
    this.maxDistance = options.maxDistance !== undefined ? options.maxDistance : 10000;
    this.refDistance = options.refDistance !== undefined ? options.refDistance : 1;
    this.rolloffFactor = options.rolloffFactor !== undefined ? options.rolloffFactor : 1;
    
    this.coneInnerAngle = options.coneInnerAngle !== undefined ? options.coneInnerAngle : 360;
    this.coneOuterAngle = options.coneOuterAngle !== undefined ? options.coneOuterAngle : 360;
    this.coneOuterGain = options.coneOuterGain !== undefined ? options.coneOuterGain : 0;
    
    this.positionX = new AudioParam(context, options.positionX !== undefined ? options.positionX : 0);
    this.positionY = new AudioParam(context, options.positionY !== undefined ? options.positionY : 0);
    this.positionZ = new AudioParam(context, options.positionZ !== undefined ? options.positionZ : 0);

    this.orientationX = new AudioParam(context, options.orientationX !== undefined ? options.orientationX : 1);
    this.orientationY = new AudioParam(context, options.orientationY !== undefined ? options.orientationY : 0);
    this.orientationZ = new AudioParam(context, options.orientationZ !== undefined ? options.orientationZ : 0);
  }

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