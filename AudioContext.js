import sdl from '@kmamal/sdl';
import path from 'path';
import { AudioDestinationNode } from './AudioDestinationNode.js';
import { OscillatorNode } from './OscillatorNode.js';
import { GainNode } from './GainNode.js';
import { AudioBufferSourceNode } from './AudioBufferSourceNode.js';
import { AudioBuffer } from './AudioBuffer.js';
import { decodeAudioData } from './decoder.js';

export class AudioContext {
  constructor(options = {type: 'playback', frequency: 44100, format: 'f32', channels: 2}) {
    const { type = 'playback', frequency = 44100, format = 'f32', channels = 2 } = options;
    this.state = 'suspended';
    this._device = sdl.audio.openDevice({ 
      type,
      frequency,  // Match standard audio sample rate
      format,     // Use 32-bit float format
      channels,        // Default to stereo
    });
    
    this.destination = new AudioDestinationNode(this);
    this.sampleRate = this._device.frequency;
    this._startTime = null;
    
    this._channels = this._device.channels;
    this._bytesPerSample = this._device.bytesPerSample;
    this._minSampleValue = this._device.minSampleValue;
    this._maxSampleValue = this._device.maxSampleValue;
    this._zeroSampleValue = this._device.zeroSampleValue;
    this._range = this._maxSampleValue - this._minSampleValue;

    this._tempDir = path.join('.', 'webaudio_temp');
  }

  get currentTime() {
    if (!this._startTime) return 0;
    return (Date.now() - this._startTime) / 1000;
  }

  resume() {
    if (this.state === 'suspended') {
      this._startTime = Date.now();
      this._device.play();
      this.state = 'running';
    }
    return Promise.resolve();
  }

  suspend() {
    if (this.state === 'running') {
      this._device.pause();
      this.state = 'suspended';
    }
    return Promise.resolve();
  }

  close() {
    if (this.state !== 'closed') {
      this._device.close();
      this.state = 'closed';
    }
    return Promise.resolve();
  }

  createOscillator() {
    return new OscillatorNode(this);
  }

  createGain() {
    return new GainNode(this);
  }

  createBufferSource() {
    return new AudioBufferSourceNode(this);
  }

  createBuffer(numberOfChannels, length, sampleRate) {
    return new AudioBuffer({
      length,
      numberOfChannels,
      sampleRate: sampleRate || this.sampleRate
    });
  }

  async decodeAudioData(audioData, successCallback, errorCallback) {
    try {
      const audioBuffer = await decodeAudioData(audioData, this);
      
      if (successCallback) {
        try {
          successCallback(audioBuffer);
        } catch (callbackError) {
          console.error('Error in successCallback:', callbackError);
        }
      }

      return audioBuffer;

    } catch (error) {
      if (errorCallback) {
        try {
          errorCallback(error);
        } catch (callbackError) {
          console.error('Error in errorCallback:', callbackError);
        }
      }

      throw error;
    }
  }
}