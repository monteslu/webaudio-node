import { AudioNode } from './AudioNode.js';

export class GainNode extends AudioNode {
  constructor(context) {
    super(context);
    this.gain = {
      value: 1.0,
      _scheduledValues: [],
      _startTime: null,
      setValueAtTime: (value, time) => {
        this.gain.value = value;
        this.gain._scheduledValues.push({
          type: 'instant',
          value,
          time,
          endTime: time
        });
        // Initialize startTime if this is first event
        if (this.gain._startTime === null) {
          this.gain._startTime = this.context.currentTime;
        }
      },
      exponentialRampToValueAtTime: (value, endTime) => {
        if (value <= 0) {
          throw new Error("exponentialRampToValueAtTime value must be greater than zero");
        }
        
        const startValue = this.gain.value;
        const startTime = this.context.currentTime;
        
        this.gain._scheduledValues.push({
          type: 'exponential',
          startValue,
          endValue: value,
          startTime,
          endTime
        });
      }
    };
  }

  _getCurrentGain() {
    const now = this.context.currentTime;
    
    // Find the active automation event
    for (let i = this.gain._scheduledValues.length - 1; i >= 0; i--) {
      const event = this.gain._scheduledValues[i];
      
      if (now >= event.startTime && now <= event.endTime) {
        if (event.type === 'instant') {
          return event.value;
        } else if (event.type === 'exponential') {
          // Calculate progress through the ramp
          const timeProgress = (now - event.startTime) / (event.endTime - event.startTime);
          const exponentialProgress = Math.pow(event.endValue / event.startValue, timeProgress);
          return event.startValue * exponentialProgress;
        }
      }
    }
    
    // If no active automation, return the current value
    return this.gain.value;
  }

  _process() {
    if (this._inputs.length === 0) return Buffer.alloc(0);

    const inputBuffer = this._inputs[0]._process();
    if (!inputBuffer || inputBuffer.length === 0) return Buffer.alloc(0);

    const buffer = Buffer.alloc(inputBuffer.length);
    let offset = 0;

    // Get current gain value considering automation
    const currentGain = this._getCurrentGain();
    console.log('Processing with gain:', currentGain);

    while (offset < inputBuffer.length) {
      const sample = this.context._device.readSample(inputBuffer, offset);
      const normalized = (sample - this.context._zeroSampleValue) / (this.context._range / 2);
      const scaled = this.context._zeroSampleValue + 
        (normalized * currentGain * (this.context._range / 2));
      offset = this.context._device.writeSample(buffer, scaled, offset);
    }

    return buffer;
  }
}
