import { AudioNode } from './AudioNode.js';

export class GainNode extends AudioNode {
  constructor(context) {
    super(context);
    this.gain = {
      value: 1.0,
      _events: [],
      setValueAtTime: (value, time) => {
        this.gain._events.push({
          type: 'setValue',
          value,
          time
        });
        this.gain.value = value;
        
        // Update SDL device volume if connected to a source
        if (this._inputs[0] && this._inputs[0]._deviceIndex >= 0) {
          const device = this.context._devices[this._inputs[0]._deviceIndex];
          device.setVolume(Math.max(0, Math.min(1, value)));
        }
      }
    };
  }

  connect(destination) {
    super.connect(destination);
    
    // Set initial volume on connection
    if (this._inputs[0] && this._inputs[0]._deviceIndex >= 0) {
      const device = this.context._devices[this._inputs[0]._deviceIndex];
      device.setVolume(Math.max(0, Math.min(1, this.gain.value)));
    }
    
    return destination;
  }
}