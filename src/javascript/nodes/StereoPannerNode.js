import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class StereoPannerNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('stereoPanner', options);
        super(context, nodeId);

        this.numberOfInputs = 1;
        this.numberOfOutputs = 1;

        // Simple stereo panner (-1 = left, 1 = right)
        this.pan = new AudioParam(context, nodeId, 'pan', 0.0, -1.0, 1.0);

        // Set initial value from options if provided
        if (options.pan !== undefined) this.pan.value = options.pan;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined)
            this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }
}
