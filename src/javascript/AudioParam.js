export class AudioParam {
	constructor(context, nodeId, paramName, defaultValue, minValue = -3.4e38, maxValue = 3.4e38) {
		this.context = context;
		this._nodeId = nodeId;
		this._paramName = paramName;
		this._value = defaultValue;
		this.defaultValue = defaultValue;
		this.minValue = minValue;
		this.maxValue = maxValue;
	}

	get value() {
		return this._value;
	}

	set value(v) {
		this._value = Math.max(this.minValue, Math.min(this.maxValue, v));
		this.context._engine.setNodeParameter(this._nodeId, this._paramName, this._value);
	}

	setValueAtTime(value, startTime) {
		this._value = value;
		this.context._engine.scheduleParameterValue(
			this._nodeId,
			this._paramName,
			'setValueAtTime',
			value,
			startTime
		);
		return this;
	}

	linearRampToValueAtTime(value, endTime) {
		this._value = value;
		this.context._engine.scheduleParameterValue(
			this._nodeId,
			this._paramName,
			'linearRampToValueAtTime',
			value,
			endTime
		);
		return this;
	}

	exponentialRampToValueAtTime(value, endTime) {
		this._value = value;
		this.context._engine.scheduleParameterValue(
			this._nodeId,
			this._paramName,
			'exponentialRampToValueAtTime',
			value,
			endTime
		);
		return this;
	}

	setTargetAtTime(target, startTime, timeConstant) {
		this._value = target;
		this.context._engine.scheduleParameterValue(
			this._nodeId,
			this._paramName,
			'setTargetAtTime',
			target,
			startTime,
			timeConstant
		);
		return this;
	}

	setValueCurveAtTime(values, startTime, duration) {
		if (!values || values.length === 0) {
			throw new TypeError('setValueCurveAtTime: values must be a non-empty array');
		}
		if (duration <= 0) {
			throw new RangeError('setValueCurveAtTime: duration must be positive');
		}

		// Convert to regular array if it's a Float32Array
		const valuesArray = Array.isArray(values) ? values : Array.from(values);

		this.context._engine.scheduleParameterValue(
			this._nodeId,
			this._paramName,
			'setValueCurveAtTime',
			valuesArray,
			startTime,
			duration
		);
		return this;
	}

	cancelScheduledValues(cancelTime) {
		this.context._engine.scheduleParameterValue(
			this._nodeId,
			this._paramName,
			'cancelScheduledValues',
			cancelTime
		);
		return this;
	}

	cancelAndHoldAtTime(cancelTime) {
		this.context._engine.scheduleParameterValue(
			this._nodeId,
			this._paramName,
			'cancelAndHoldAtTime',
			cancelTime
		);
		return this;
	}
}
