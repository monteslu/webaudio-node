import { AudioNode } from './AudioNode.js';

export class AudioDestinationNode extends AudioNode {
  constructor(context) {
    super(context);
    this.numberOfInputs = 1;
    this.numberOfOutputs = 0;
  }

  // No processing needed - direct device output
  _process() {}
}