import { AudioNode } from './AudioNode.js';

export class OscillatorNode extends AudioNode {
  constructor(context) {
    super(context);
    this.frequency = {
      value: 440,
      setValueAtTime: (value, time) => {
        console.log('Setting frequency:', value, 'at time:', time);
        this.frequency.value = value;
      }
    };
    this.type = 'sine';
    this._phase = 0;
    this._started = false;
    this._stopped = false;
    this.onended = null;
    this._TWO_PI = 2 * Math.PI;
    console.log('Created oscillator with frequency:', this.frequency.value);
  }

  _generateSample(phase, type = 'sine') {
    switch (type) {
      case 'square':
        return Math.sin(phase) >= 0 ? 1.0 : -1.0;
      case 'sawtooth':
        return 2.0 * (phase / this._TWO_PI - Math.floor(0.5 + phase / this._TWO_PI));
      case 'triangle':
        return 2.0 * Math.abs(2.0 * (phase / this._TWO_PI - Math.floor(0.5 + phase / this._TWO_PI))) - 1.0;
      case 'sine':
      default:
        return Math.sin(phase);
    }
  }

  _process() {
    if (!this._started || this._stopped) {
      return Buffer.alloc(0);
    }

    const duration = 0.05; // 50ms chunks
    const numFrames = Math.floor(duration * this.context.sampleRate);
    const buffer = Buffer.alloc(numFrames * this.context._channels * this.context._bytesPerSample);
    
    let offset = 0;
    const amplitude = this.context._range * 0.3; // 30% of range to avoid clipping

    // Log occasionally to track frequency
    if (Math.random() < 0.01) {
      console.log('Generating oscillator at freq:', this.frequency.value, 'Hz');
    }

    // Calculate phase increment per sample
    const phaseIncrement = this.frequency.value * this._TWO_PI / this.context.sampleRate;

    for (let i = 0; i < numFrames; i++) {
      // Generate the waveform
      const sample = this._generateSample(this._phase, this.type);
      
      // Scale to device range
      const scaledSample = this.context._zeroSampleValue + (sample * amplitude);

      // Write to all channels
      for (let j = 0; j < this.context._channels; j++) {
        offset = this.context._device.writeSample(buffer, scaledSample, offset);
      }

      // Update phase
      this._phase += phaseIncrement;
      while (this._phase >= this._TWO_PI) {
        this._phase -= this._TWO_PI;
      }
    }

    return buffer;
  }

  start(when = 0) {
    console.log('Starting oscillator, frequency:', this.frequency.value);
    this._started = true;
    this._stopped = false;
    this._phase = 0;  // Reset phase on start
    
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    
    if (this.context.destination._startProcessing) {
      this.context.destination._startProcessing();
    }
  }

  stop(when = 0) {
    console.log('Stopping oscillator at:', when);
    const timeoutMs = Math.max(0, when * 1000);
    setTimeout(() => {
      console.log('Oscillator stop timeout fired');
      this._stopped = true;
      if (this.onended) {
        this.onended();
      }
    }, timeoutMs);
  }
}