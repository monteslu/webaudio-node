export class AudioNode {
  constructor(context, options = {}) {
    this.context = context;
    this.numberOfInputs = 0;
    this.numberOfOutputs = 1;
    this.channelCount = options.channelCount || 2;
    this.channelCountMode = options.channelCountMode ||'explicit';
    this.channelInterpretation = options.channelInterpretation || 'speakers';
    this._inputs = [];
    this._outputs = [];
  }

  connect(destination) {
    // Check if connecting to context.destination
    if (destination === this.context.destination) {
      // No actual connection needed - device handles output
      return destination;
    }

    if (!(destination instanceof AudioNode)) {
      throw new Error('Destination must be an AudioNode');
    }

    destination._inputs.push(this);
    this._outputs.push(destination);
    return destination;
  }

  disconnect() {
    this._outputs.forEach(node => {
      const index = node._inputs.indexOf(this);
      if (index !== -1) {
        node._inputs.splice(index, 1);
      }
    });
    this._outputs = [];
  }
}