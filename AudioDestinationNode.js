import { AudioNode } from './AudioNode.js';
import { PROCESSING_INTERVAL } from './constants.js';

export class AudioDestinationNode extends AudioNode {
  constructor(context) {
    super(context);
    this.numberOfInputs = 1;
    this.numberOfOutputs = 0;
    this._processInterval = null;
    this._isProcessing = false;
    this._activeInputs = new Set(); // Track active sources
  }

  _startProcessing() {
    if (!this._processInterval && !this._isProcessing) {
      this._isProcessing = true;
      this._processInterval = setInterval(() => {
        if (this._isProcessing) {
          this._process();
        }
      }, PROCESSING_INTERVAL);
    }
  }

  _stopProcessing() {
    this._isProcessing = false;
    if (this._processInterval) {
      clearInterval(this._processInterval);
      this._processInterval = null;
    }
  }

  _process() {
    if (!this._isProcessing || this._inputs.length === 0) {
      return;
    }

    // Accumulate samples from all active inputs
    const duration = 0.05; // 50ms chunks
    const numFrames = Math.floor(duration * this.context.sampleRate);
    const numSamples = numFrames * this.context._channels;
    const mixBuffer = new Float32Array(numSamples);
    let hasActiveSource = false;

    for (const inputNode of this._inputs) {
      if (!inputNode._process) continue;

      const buffer = inputNode._process();
      if (buffer && buffer.length > 0) {
        hasActiveSource = true;
        // Add samples to mix buffer
        for (let i = 0; i < numSamples && i < buffer.length / this.context._bytesPerSample; i++) {
          const sample = this.context._device.readSample(buffer, i * this.context._bytesPerSample);
          const normalized = (sample - this.context._zeroSampleValue) / (this.context._range / 2);
          mixBuffer[i] += normalized;
        }
      }
    }

    if (hasActiveSource) {
      // Convert mixed samples back to device format
      const outputBuffer = Buffer.alloc(numSamples * this.context._bytesPerSample);
      let offset = 0;

      for (let i = 0; i < mixBuffer.length; i++) {
        // Clamp mixed value to [-1, 1]
        const clampedValue = Math.max(-1, Math.min(1, mixBuffer[i]));
        const deviceSample = this.context._zeroSampleValue + 
          (clampedValue * (this.context._range / 2));
        offset = this.context._device.writeSample(outputBuffer, deviceSample, offset);
      }

      if (this.context.state !== 'closed') {
        this.context._device.enqueue(outputBuffer);
      }
    } else {
      // No active sources, stop processing but don't close the context
      this._stopProcessing();
    }
  }
}