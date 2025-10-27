import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class AudioBufferSourceNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('bufferSource', options);
        super(context, nodeId);

        // Apply options
        this.buffer = options.buffer !== undefined ? options.buffer : null;

        const playbackRate = options.playbackRate !== undefined ? options.playbackRate : 1.0;
        const detune = options.detune !== undefined ? options.detune : 0.0;

        this.playbackRate = new AudioParam(context, nodeId, 'playbackRate', playbackRate, 0.0, 100.0);
        this.detune = new AudioParam(context, nodeId, 'detune', detune, -1200.0, 1200.0);

        this.loop = options.loop !== undefined ? options.loop : false;
        this.loopStart = options.loopStart !== undefined ? options.loopStart : 0;
        this.loopEnd = options.loopEnd !== undefined ? options.loopEnd : 0;
        this.onended = null;

        this._started = false;
        this._stopped = false;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined) this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }

    start(when = 0, offset = 0, duration) {
        if (this._started) {
            throw new Error('Cannot call start more than once');
        }

        if (!this.buffer) {
            throw new Error('Cannot start without a buffer');
        }

        this._started = true;

        // Register buffer with engine if not already registered
        if (!this.context._registeredBuffers) {
            this.context._registeredBuffers = new Set();
        }

        if (!this.context._registeredBuffers.has(this.buffer._id)) {
            const bufferData = this.buffer._getInterleavedData();
            this.context._engine.registerBuffer(
                this.buffer._id,
                bufferData,
                this.buffer.length,
                this.buffer.numberOfChannels
            );
            this.context._registeredBuffers.add(this.buffer._id);
        }

        // Set buffer ID (not data) in native code
        this.context._engine.setNodeBufferId(this._nodeId, this.buffer._id);

        // Set playback offset and duration
        if (offset !== 0) {
            this.context._engine.setNodeParameter(this._nodeId, 'playbackOffset', offset);
        }
        if (duration !== undefined) {
            this.context._engine.setNodeParameter(this._nodeId, 'playbackDuration', duration);
        }

        // Set loop parameters
        this.context._engine.setNodeParameter(this._nodeId, 'loop', this.loop ? 1.0 : 0.0);
        this.context._engine.setNodeParameter(this._nodeId, 'loopStart', this.loopStart);
        this.context._engine.setNodeParameter(this._nodeId, 'loopEnd', this.loopEnd);

        // Start node
        this.context._engine.startNode(this._nodeId, when);

        // Schedule end event
        if (this.onended && !this.loop) {
            const endTime = (when + this.buffer.duration) * 1000;
            setTimeout(() => {
                if (this.onended && !this._stopped) {
                    this.onended({ target: this });
                }
            }, endTime);
        }
    }

    stop(when = 0) {
        if (!this._started || this._stopped) {
            return;
        }

        this._stopped = true;
        this.context._engine.stopNode(this._nodeId, when);
    }
}
