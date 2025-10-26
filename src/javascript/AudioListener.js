/**
 * Simple AudioParam-like object for AudioListener parameters
 * These don't need full AudioParam functionality since they're not attached to audio nodes
 */
class ListenerParam {
	constructor(defaultValue) {
		this._value = defaultValue;
		this.defaultValue = defaultValue;
	}

	get value() {
		return this._value;
	}

	set value(v) {
		this._value = v;
	}

	// Stub automation methods (AudioListener params don't support automation in most implementations)
	setValueAtTime(value, startTime) {
		this._value = value;
		return this;
	}

	linearRampToValueAtTime(value, endTime) {
		this._value = value;
		return this;
	}

	exponentialRampToValueAtTime(value, endTime) {
		this._value = value;
		return this;
	}
}

/**
 * AudioListener represents the position and orientation of the person listening to the audio scene.
 * All PannerNode objects spatialize in relation to the AudioContext's listener.
 */
export class AudioListener {
	constructor(context) {
		this._context = context;

		// Position params (default: origin)
		this.positionX = new ListenerParam(0);
		this.positionY = new ListenerParam(0);
		this.positionZ = new ListenerParam(0);

		// Forward direction params (default: looking down negative Z axis)
		this.forwardX = new ListenerParam(0);
		this.forwardY = new ListenerParam(0);
		this.forwardZ = new ListenerParam(-1);

		// Up direction params (default: positive Y axis)
		this.upX = new ListenerParam(0);
		this.upY = new ListenerParam(1);
		this.upZ = new ListenerParam(0);
	}

	/**
	 * Legacy method for setting position (deprecated in spec, use positionX/Y/Z instead)
	 * @deprecated
	 */
	setPosition(x, y, z) {
		this.positionX.value = x;
		this.positionY.value = y;
		this.positionZ.value = z;
	}

	/**
	 * Legacy method for setting orientation (deprecated in spec, use forwardX/Y/Z and upX/Y/Z instead)
	 * @deprecated
	 */
	setOrientation(x, y, z, xUp, yUp, zUp) {
		this.forwardX.value = x;
		this.forwardY.value = y;
		this.forwardZ.value = z;
		this.upX.value = xUp;
		this.upY.value = yUp;
		this.upZ.value = zUp;
	}
}
