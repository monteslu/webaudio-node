import sdl from '@kmamal/sdl';
import path from 'path';
import { AudioDestinationNode } from './AudioDestinationNode.js';
import { OscillatorNode } from './OscillatorNode.js';
import { GainNode } from './GainNode.js';
import { AudioBufferSourceNode } from './AudioBufferSourceNode.js';
import { AudioBuffer } from './AudioBuffer.js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';

export class AudioContext {
  constructor(options = {type: 'playback', frequency: 44100, format: 'f32', channels: 2}) {
    const { type = 'playback', frequency = 44100, format = 'f32', channels = 2 } = options;
    this.state = 'suspended';
    this._devices = [];
    
    for (let i = 0; i < 8; i++) {
      const device = sdl.audio.openDevice({ type, frequency, format, channels });
      this._devices.push({
        device,
        inUse: false,
        id: i,
        endTime: 0
      });
    }
    
    this.destination = new AudioDestinationNode(this);
    this.sampleRate = frequency;
    this._startTime = null;
    this._format = format;
    this._channels = channels;
    this._tempDir = path.join('.', 'webaudio_temp');
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

  createBuffer(numberOfChannels, length, sampleRate) {
    return new AudioBuffer({
      length,
      numberOfChannels,
      sampleRate: sampleRate || this.sampleRate
    });
  }

  async decodeAudioData(audioData, successCallback, errorCallback) {
    try {
      const buffer = Buffer.from(audioData);
      const tempDir = path.join('.', 'webaudio_temp');
      const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2);
      const inputPath = path.join(tempDir, `input_${uniqueId}`);
      const outputPath = path.join(tempDir, `output_${uniqueId}`);

      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(inputPath, buffer);

      const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!audioStream) throw new Error('No audio stream found');

      const channels = audioStream.channels;
      const sampleRate = parseInt(audioStream.sample_rate);
      const duration = parseFloat(audioStream.duration);
      const numSamples = Math.ceil(duration * sampleRate);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat('f32le')
          .audioChannels(channels)
          .audioFrequency(sampleRate)
          .output(outputPath)
          .on('error', reject)
          .on('end', resolve)
          .run();
      });

      const rawData = await fs.readFile(outputPath);
      const floatArray = new Float32Array(rawData.buffer, rawData.byteOffset, rawData.length / 4);
      
      const audioBuffer = new AudioBuffer({
        length: numSamples,
        numberOfChannels: channels,
        sampleRate: sampleRate
      });

      // De-interleave channels
      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < numSamples; i++) {
          channelData[i] = floatArray[i * channels + channel];
        }
      }

      // Clean up temp files
      await fs.rm(inputPath, { force: true }).catch(() => {});
      await fs.rm(outputPath, { force: true }).catch(() => {});

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