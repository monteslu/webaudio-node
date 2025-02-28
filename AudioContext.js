import sdl from '@kmamal/sdl';
import { AudioDestinationNode } from './AudioDestinationNode.js';
import { OscillatorNode } from './OscillatorNode.js';
import { GainNode } from './GainNode.js';
import { AudioBufferSourceNode } from './AudioBufferSourceNode.js';
import { AudioBuffer } from './AudioBuffer.js';
import { PannerNode } from './PannerNode.js';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

const NUM_DEVICES = 12;

export class AudioContext {
  constructor(options = {type: 'playback', frequency: 44100, format: 'f32', channels: 1}) {
    const { type = 'playback', frequency = 44100, format = 'f32', channels = 1 } = options;
    this.state = 'suspended';
    this._devices = [];
    
    for (let i = 0; i < NUM_DEVICES; i++) {
      try {
        const device = sdl.audio.openDevice({ type, frequency, format, channels });
        this._devices.push({
          device,
          inUse: false,
          id: i,
          endTime: 0
        });
      } catch (e) {
        console.error('error opening device', e);
      }
    }
    
    this.destination = new AudioDestinationNode(this);
    this.sampleRate = frequency;
    this._startTime = null;
    this._format = format;
    this._channels = channels;
  }

  acquireDevice(isMusicTrack = false) {
    const now = Date.now();
    const availableDevices = this._devices.filter(d => !d.inUse || now > d.endTime);
    
    if (availableDevices.length > 0) {
      const deviceInfo = availableDevices[0];
      deviceInfo.inUse = true;
      return deviceInfo;
    }
    return null;
  }

  releaseDevice(deviceInfo) {
    if (deviceInfo && deviceInfo.id !== undefined) {
      this._devices[deviceInfo.id].inUse = false;
    }
  }

  get currentTime() {
    if (!this._startTime) return 0;
    return (Date.now() - this._startTime) / 1000;
  }

  resume() {
    if (this.state === 'suspended') {
      this._startTime = Date.now();
      this._devices.forEach(d => d.device.play());
      this.state = 'running';
    }
    return Promise.resolve();
  }

  suspend() {
    if (this.state === 'running') {
      this._devices.forEach(d => d.device.pause());
      this.state = 'suspended';
    }
    return Promise.resolve();
  }

  close() {
    if (this.state !== 'closed') {
      this._devices.forEach(d => d.device.close());
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

  createPanner() {
    return new PannerNode(this);
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
      // Create input stream
      const inputStream = new Readable();
      inputStream.push(Buffer.from(audioData));
      inputStream.push(null);

      // Decode directly to memory using streams
      const chunks = [];
      await new Promise((resolve, reject) => {
        ffmpeg(inputStream)
          .toFormat('f32le')
          .audioChannels(this._channels)
          .audioFrequency(this.sampleRate)
          .on('error', reject)
          .pipe()
          .on('data', chunk => chunks.push(chunk))
          .on('end', resolve);
      });

      // Combine chunks and create float array
      const buffer = Buffer.concat(chunks);

      const numSamples = (buffer.length / this._channels) / 4;

      const audioBuffer = new AudioBuffer({
        length: numSamples,
        numberOfChannels: this._channels,
        sampleRate: this.sampleRate
      });
      audioBuffer.buffer = buffer;

      if (successCallback) {
        successCallback(audioBuffer);
      }
      return audioBuffer;

    } catch (error) {
      if (errorCallback) {
        errorCallback(error);
      }
      throw error;
    }
  }
}