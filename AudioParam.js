/**
 * Implementation of Web Audio API's AudioParam interface
 */
export class AudioParam {
  constructor(defaultValue) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
    this.minValue = -3.4028235e38;
    this.maxValue = 3.4028235e38;
    this._scheduledValues = [];
  }

  setValueAtTime(value, startTime) {
    this.value = value;
    this._scheduledValues.push({ type: 'setValueAtTime', value, time: startTime });
    return this;
  }

  linearRampToValueAtTime(value, endTime) {
    this.value = value;
    this._scheduledValues.push({ type: 'linearRampToValueAtTime', value, time: endTime });
    return this;
  }

  exponentialRampToValueAtTime(value, endTime) {
    if (value <= 0) {
      throw new DOMException('exponentialRampToValueAtTime value must be greater than zero', 'InvalidStateError');
    }
    this.value = value;
    this._scheduledValues.push({ type: 'exponentialRampToValueAtTime', value, time: endTime });
    return this;
  }

  setTargetAtTime(target, startTime, timeConstant) {
    this.value = target;
    this._scheduledValues.push({ 
      type: 'setTargetAtTime', 
      value: target, 
      time: startTime, 
      timeConstant 
    });
    return this;
  }

  setValueCurveAtTime(values, startTime, duration) {
    this.value = values[values.length - 1];
    this._scheduledValues.push({ 
      type: 'setValueCurveAtTime', 
      values: values.slice(), 
      time: startTime,
      duration 
    });
    return this;
  }

  cancelScheduledValues(cancelTime) {
    this._scheduledValues = this._scheduledValues.filter(event => event.time < cancelTime);
    return this;
  }

  cancelAndHoldAtTime(cancelTime) {
    // Get the computed value at cancelTime
    const computedValue = this._getValueAtTime(cancelTime);
    this._scheduledValues = this._scheduledValues.filter(event => event.time < cancelTime);
    this.setValueAtTime(computedValue, cancelTime);
    return this;
  }

  _getValueAtTime(time) {
    // Find the most recent event before this time
    const events = this._scheduledValues
      .filter(event => event.time <= time)
      .sort((a, b) => b.time - a.time);

    if (events.length === 0) return this.defaultValue;

    const lastEvent = events[0];
    switch (lastEvent.type) {
      case 'setValueAtTime':
      case 'exponentialRampToValueAtTime':
      case 'linearRampToValueAtTime':
        return lastEvent.value;
      case 'setTargetAtTime':
        const elapsed = time - lastEvent.time;
        return lastEvent.value + (this.value - lastEvent.value) * 
          Math.exp(-elapsed / lastEvent.timeConstant);
      case 'setValueCurveAtTime':
        const phase = (time - lastEvent.time) / lastEvent.duration;
        const index = Math.min(Math.floor(phase * lastEvent.values.length), 
          lastEvent.values.length - 1);
        return lastEvent.values[index];
      default:
        return this.value;
    }
  }
}
