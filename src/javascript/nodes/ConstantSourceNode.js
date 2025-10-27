import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class ConstantSourceNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('constantSource', options);
        super(context, nodeId);

        const { offset = 1.0 } = options;
        this.offset = new AudioParam(context, nodeId, 'offset', offset, -3.4e38, 3.4e38);

        this._started = false;
        this._stopped = false;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined)
            this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }

    start(when = 0) {
        if (this._started) {
            throw new Error('Cannot call start more than once');
        }

        this._started = true;
        this.context._engine.startNode(this._nodeId, when);
    }

    stop(when = 0) {
        if (!this._started || this._stopped) {
            return;
        }

        this._stopped = true;
        this.context._engine.stopNode(this._nodeId, when);
    }
}
