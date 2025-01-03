import { AudioNode } from './AudioNode.js';
import { AudioParam } from './AudioParam.js';

export class AudioBufferSourceNode extends AudioNode {
  constructor(context) {
    super(context);
    this.buffer = null;
    this.playbackRate = new AudioParam(context, 1.0);
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
      //console.log('Device still playing, skipping');
      this.context.releaseDevice(deviceInfo);
      return;
    }
    
    deviceInfo.endTime = this._endTime;
    // console.log('Starting playback on device:', deviceInfo.id);
    
    try {


      const duration = this.buffer.duration * 1000;
      // console.log('duration', duration, this.buffer.duration);
      
      setTimeout(() => {
        if (!this._stopped) {
          // console.log('Auto releasing device after duration:', this._deviceInfo.id);
          this._stopped = true;
          this.context.releaseDevice(this._deviceInfo);
          this._deviceInfo = null;
          if (this.onended) {
            this.onended({ target: this });
          }
        }
      }, Math.max(50, duration + 50));

      deviceInfo.device.enqueue(this.buffer.buffer);
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
      // console.log('Manual stop for device:', this._deviceInfo.id);
      this.context.releaseDevice(this._deviceInfo);
      this._deviceInfo = null;
    }
    this._stopped = true;  
  }
}