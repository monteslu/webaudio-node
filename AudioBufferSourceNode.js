import { AudioNode } from './AudioNode.js';

export class AudioBufferSourceNode extends AudioNode {
  constructor(context) {
    super(context);
    this.buffer = null;
    this.playbackRate = 1.0;
    this.loop = false;
    this._started = false;
    this._stopped = false;
    this.onended = null;
    this._deviceInfo = null;
    this._endTime = 0;
  }

  start(when = 0) {
    if (this._started || !this.buffer || !this.buffer._channels) return;
    
    this._started = true;
    const isMusicTrack = this.buffer.duration > 30;
    
    const deviceInfo = this.context.acquireDevice(isMusicTrack);
    if (!deviceInfo) {
      console.log(isMusicTrack ? 'Music queued' : 'No device available');
      return;
    }

    this._deviceInfo = deviceInfo;
    const now = Date.now();
    this._endTime = now + (this.buffer.duration * 1000);
    
    if (deviceInfo.endTime && now < deviceInfo.endTime) {
      console.log('Device still playing, skipping');
      this.context.releaseDevice(deviceInfo);
      return;
    }
    
    deviceInfo.endTime = this._endTime;
    console.log('Starting playback on device:', deviceInfo.id);
    
    try {
      const numChannels = this.buffer.numberOfChannels;
      const length = this.buffer.length;
      const bytesPerSample = 4;
      const buffer = Buffer.alloc(length * numChannels * bytesPerSample);

      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const value = this.buffer._channels[channel][i];
          buffer.writeFloatLE(value, (i * numChannels + channel) * bytesPerSample);
        }
      }

      const duration = this.buffer.duration * 1000;
      
      setTimeout(() => {
        if (!this._stopped) {
          console.log('Auto releasing device after duration:', this._deviceInfo.id);
          this._stopped = true;
          this.context.releaseDevice(this._deviceInfo);
          this._deviceInfo = null;
          if (this.onended) {
            this.onended();
          }
        }
      }, Math.max(100, duration + 100));

      deviceInfo.device.enqueue(buffer);
      deviceInfo.device.play();

    } catch (err) {
      console.error('Playback failed:', err);
      if (this._deviceInfo) {
        this.context.releaseDevice(this._deviceInfo);
        this._deviceInfo = null;
      }
    }
  }

  stop() {
    if (this._deviceInfo) {
      console.log('Manual stop for device:', this._deviceInfo.id);
      this.context.releaseDevice(this._deviceInfo);
      this._deviceInfo = null;
    }
    this._stopped = true;  
  }
}