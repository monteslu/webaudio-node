/**
 * Implementation of Web Audio API's AudioBuffer interface
 */
export class AudioBuffer {
  constructor({ length, numberOfChannels, sampleRate }) {
    this.length = length;
    this.numberOfChannels = numberOfChannels;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channels = Array(numberOfChannels).fill().map(() => new Float32Array(length));
  }

  getChannelData(channel) {
    if (channel >= this.numberOfChannels) {
      throw new Error('Channel index out of bounds');
    }
    return this._channels[channel];
  }

  copyFromChannel(destination, channelNumber, startInChannel = 0) {
    const source = this._channels[channelNumber];
    destination.set(source.subarray(startInChannel, startInChannel + destination.length));
  }

  copyToChannel(source, channelNumber, startInChannel = 0) {
    const destination = this._channels[channelNumber];
    destination.set(source, startInChannel);
  }
}
