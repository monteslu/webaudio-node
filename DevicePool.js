export class DevicePool {
  constructor(size = 8) {
    this.devices = Array(size).fill(null);
    this.musicQueue = [];
  }

  acquireDevice(audioBuffer, isMusicTrack = false) {
    if (isMusicTrack) {
      const freeIndex = this.devices.findIndex(d => !d);
      if (freeIndex >= 0) {
        this.devices[freeIndex] = { buffer: audioBuffer, isMusicTrack };
        return freeIndex;
      } else {
        this.musicQueue.push(audioBuffer);
        return -1;
      }
    }

    const freeIndex = this.devices.findIndex(d => !d);
    if (freeIndex >= 0) {
      this.devices[freeIndex] = { buffer: audioBuffer, isMusicTrack };
      return freeIndex;
    }
    
    console.log('No free audio devices available for sound effect');
    return -1;
  }

  releaseDevice(index) {
    if (index >= 0 && index < this.devices.length) {
      this.devices[index] = null;
      
      if (this.musicQueue.length > 0) {
        const nextMusicTrack = this.musicQueue.shift();
        this.devices[index] = { buffer: nextMusicTrack, isMusicTrack: true };
        return { deviceIndex: index, buffer: nextMusicTrack };
      }
    }
    return null;
  }
}