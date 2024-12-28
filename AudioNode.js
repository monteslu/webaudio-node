export class AudioNode {
  constructor(context) {
    this.context = context;
    this.numberOfInputs = 0;
    this.numberOfOutputs = 1;
    this.channelCount = context._channels;
    this.channelCountMode = 'explicit';
    this.channelInterpretation = 'speakers';
    this._inputs = [];
    this._outputs = [];
  }

  connect(destination, outputIndex = 0, inputIndex = 0) {
    console.log('connect', typeof destination, destination instanceof AudioNode, destination.constructor.name);
    if (!(destination instanceof AudioNode)) {
      throw new Error('Destination must be an AudioNode');
    }

    // Simply connect nodes - let specific node types handle their constraints
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

  _process() {
    // Override in subclasses
    return Buffer.alloc(0);
  }
}