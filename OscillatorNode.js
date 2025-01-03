import { AudioNode } from './AudioNode.js';

export class OscillatorNode extends AudioNode {
  constructor(context) {
    super(context);
    this.frequency = {
      value: 800,
      _events: [],
      setValueAtTime: (value, time) => {
        this.frequency._events.push({
          type: 'setValue',
          value,
          time
        });
        this.frequency.value = value;
      },
      exponentialRampToValueAtTime: (value, endTime) => {
        if (value <= 0) throw new Error('Cannot ramp to zero or negative value');
        const lastEvent = this.frequency._events[this.frequency._events.length - 1];
        const startEvent = {
          type: 'setValue',
          value: lastEvent ? lastEvent.value : this.frequency.value,
          time: lastEvent ? lastEvent.time : this.context.currentTime
        };
        
        this.frequency._events.push({
          type: 'exponentialRamp',
          startValue: startEvent.value,
          endValue: value,
          startTime: startEvent.time,
          endTime
        });
      }
    };
    this.type = 'sawtooth';
    this._phase = 0;
    this._started = false;
    this._stopped = false;
    this._startTime = 0;
    this.onended = null;
  }

  _computeFrequency(time) {
    let value = this.frequency.value;
    for (const event of this.frequency._events) {
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

  _generateSample(phase, type) {
    const TWO_PI = 2 * Math.PI;
    switch (type) {
      case 'square':
        return Math.sign(Math.sin(phase));
      case 'sawtooth':
        return 2 * (phase / TWO_PI - Math.floor(phase / TWO_PI + 0.5));
      case 'triangle':
        return 2 * Math.abs(2 * (phase / TWO_PI - Math.floor(phase / TWO_PI + 0.5))) - 1;
      case 'sine':
      default:
        return Math.sin(phase);
    }
  }

  _process() {
    if (!this._started || this._stopped) {
      return Buffer.alloc(0);
    }

    const bufferLength = 1024; // Fixed buffer size for consistent processing
    const buffer = Buffer.alloc(bufferLength * this.context._channels * this.context._bytesPerSample);
    let offset = 0;
    const timeIncrement = 1 / this.context.sampleRate;
    const amplitude = 0.8; // Slightly reduced amplitude to prevent clipping

    for (let i = 0; i < bufferLength; i++) {
      const currentTime = this.context.currentTime + i * timeIncrement;
      const freq = this._computeFrequency(currentTime);
      const samplePhase = this._phase;
      const sample = this._generateSample(samplePhase, this.type);
      const scaledSample = this.context._zeroSampleValue + 
                          (sample * amplitude * (this.context._range / 2));

      // Write to all channels
      for (let channel = 0; channel < this.context._channels; channel++) {
        offset = this.context._device.writeSample(buffer, scaledSample, offset);
      }

      // Update phase
      this._phase += (freq * 2 * Math.PI) / this.context.sampleRate;
      if (this._phase >= 2 * Math.PI) {
        this._phase -= 2 * Math.PI;
      }
    }

    return buffer;
  }

  start(when = 0) {
    if (this._started) {
      throw new Error('OscillatorNode can only be started once');
    }
    this._started = true;
    this._stopped = false;
    this._startTime = this.context.currentTime + when;
    this._phase = 0;

    // Set initial frequency and ramp to 100 Hz over 0.5 seconds
    this.frequency.setValueAtTime(800, this.context.currentTime);
    this.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.5);

    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    if (this.context.destination._startProcessing) {
      this.context.destination._startProcessing();
    }
  }

  stop(when = 0) {
    if (this._stopped) return;
    const stopTime = Math.max(0, when * 1000);
    setTimeout(() => {
      this._stopped = true;
      if (this.onended) {
        this.onended();
      }
    }, stopTime);
  }
}