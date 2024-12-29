import { AudioNode } from './AudioNode.js';

export class GainNode extends AudioNode {
  constructor(context) {
    super(context);
    this.gain = {
      value: 0,
      _events: [],
      setValueAtTime: (value, time) => {
        this.gain._events.push({
          type: 'setValue',
          value,
          time
        });
        this.gain.value = value;
      },
      exponentialRampToValueAtTime: (value, endTime) => {
        if (value <= 0) throw new Error('Cannot ramp to zero or negative value');
        const lastEvent = this.gain._events[this.gain._events.length - 1];
        const startEvent = {
          type: 'setValue',
          value: lastEvent ? lastEvent.value : this.gain.value,
          time: lastEvent ? lastEvent.time : this.context.currentTime
        };
        
        this.gain._events.push({
          type: 'exponentialRamp',
          startValue: startEvent.value,
          endValue: value,
          startTime: startEvent.time,
          endTime
        });
      }
    };
  }

  _computeGain(time) {
    let value = this.gain.value;
    for (const event of this.gain._events) {
      if (event.type === 'setValue' && time >= event.time) {
        value = event.value;
      } else if (event.type === 'exponentialRamp' && 
                time >= event.startTime && 
                time <= event.endTime) {
        const progress = (time - event.startTime) / (event.endTime - event.startTime);
        const ratio = event.endValue / event.startValue;
        value = event.startValue * Math.pow(ratio, progress);
      }
    }
    return value;
  }

  _process() {
    if (this._inputs.length === 0) return Buffer.alloc(0);

    const inputBuffer = this._inputs[0]._process();
    if (!inputBuffer || inputBuffer.length === 0) return Buffer.alloc(0);

    const buffer = Buffer.alloc(inputBuffer.length);
    let offset = 0;
    const samplesPerFrame = this.context._channels;
    const timeIncrement = 1 / this.context.sampleRate;
    const framesInBuffer = inputBuffer.length / (this.context._bytesPerSample * samplesPerFrame);

    for (let frame = 0; frame < framesInBuffer; frame++) {
      const currentTime = this.context.currentTime + frame * timeIncrement;
      const gainValue = this._computeGain(currentTime);

      for (let channel = 0; channel < samplesPerFrame; channel++) {
        const inputOffset = (frame * samplesPerFrame + channel) * this.context._bytesPerSample;
        const sample = this.context._device.readSample(inputBuffer, inputOffset);
        const normalized = (sample - this.context._zeroSampleValue) / (this.context._range / 2);
        const scaled = this.context._zeroSampleValue + (normalized * gainValue * (this.context._range / 2));
        offset = this.context._device.writeSample(buffer, scaled, offset);
      }
    }

    return buffer;
  }
}