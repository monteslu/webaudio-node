import { AudioNode } from './AudioNode.js';

export class AudioBufferSourceNode extends AudioNode {
  constructor(context) {
    super(context);
    this.buffer = null;
    this.playbackRate = 1.0;
    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this._position = 0;
    this._started = false;
    this._stopped = false;
    this.onended = null;
    this._lastProcessTime = 0;
  }

  _process() {
    if (!this._started || this._stopped || !this.buffer) {
      return Buffer.alloc(0);
    }

    // Calculate how many samples to generate
    const duration = 0.05; // 50ms chunks
    const outputSampleRate = this.context.sampleRate;
    const numOutputFrames = Math.floor(duration * outputSampleRate);
    const outputBuffer = Buffer.alloc(numOutputFrames * this.context._channels * this.context._bytesPerSample);
    
    let outputOffset = 0;

    // Calculate resampling increment
    const sampleIncrement = this.buffer.sampleRate / outputSampleRate;
    const sourcePosition = this._position;

    for (let i = 0; i < numOutputFrames; i++) {
      // Calculate the exact source position
      const exactSourcePos = sourcePosition + (i * sampleIncrement);
      const sourcePos = Math.floor(exactSourcePos);
      
      if (sourcePos >= this.buffer.length) {
        if (this.loop) {
          this._position = 0;
          continue;
        } else {
          this._stopped = true;
          if (this.onended) {
            setTimeout(this.onended, 0);
          }
          break;
        }
      }

      // Get interpolated sample
      let sample = 0;
      for (let channel = 0; channel < this.buffer.numberOfChannels; channel++) {
        const channelData = this.buffer.getChannelData(channel);
        // Linear interpolation between samples
        const pos1 = sourcePos;
        const pos2 = Math.min(pos1 + 1, this.buffer.length - 1);
        const fraction = exactSourcePos - pos1;
        const value1 = channelData[pos1];
        const value2 = channelData[pos2];
        sample += value1 + (value2 - value1) * fraction;
      }
      sample /= this.buffer.numberOfChannels;

      // Convert to device format
      const scaledSample = this.context._zeroSampleValue + 
        (sample * (this.context._range / 2));

      // Write to all output channels
      for (let j = 0; j < this.context._channels; j++) {
        outputOffset = this.context._device.writeSample(outputBuffer, scaledSample, outputOffset);
      }
    }

    // Update position
    this._position += numOutputFrames * sampleIncrement;

    if (this._position % (this.buffer.sampleRate * 10) < sampleIncrement) {
      console.log('Playback progress:', {
        seconds: this._position / this.buffer.sampleRate,
        totalSeconds: this.buffer.length / this.buffer.sampleRate
      });
    }

    return outputBuffer;
  }

  start(when = 0, offset = 0, duration = undefined) {
    if (this._started) {
      throw new DOMException('Already started', 'InvalidStateError');
    }

    this._started = true;
    this._stopped = false;
    this._position = offset * this.buffer.sampleRate;
    this._lastProcessTime = Date.now();
    
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    
    if (this.context.destination._startProcessing) {
      this.context.destination._startProcessing();
    }

    if (duration !== undefined) {
      setTimeout(() => {
        this._stopped = true;
        this.context.destination._stopProcessing();
        if (this.onended) {
          this.onended();
        }
      }, duration * 1000);
    }
  }

  stop(when = 0) {
    this._stopped = true;
    setTimeout(() => {
      this.context.destination._stopProcessing();
      if (this.onended) {
        this.onended();
      }
    }, when * 1000);
  }
}