import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class OscillatorNode extends AudioNode {
    constructor(context, options = {}) {
        const type = options.type || 'sine';
        const nodeId = context._engine.createNode('oscillator', { ...options, type });
        super(context, nodeId);

        this.numberOfInputs = 0;
        this.numberOfOutputs = 1;

        // Apply options for AudioParams
        const freq = options.frequency !== undefined ? options.frequency : 440.0;
        const det = options.detune !== undefined ? options.detune : 0.0;

        this.frequency = new AudioParam(context, nodeId, 'frequency', freq, 0.0, context.sampleRate / 2);
        this.detune = new AudioParam(context, nodeId, 'detune', det, -4800.0, 4800.0);

        this._type = type;
        this._started = false;
        this._stopped = false;
        this.onended = null;

        // Apply periodicWave if provided
        if (options.periodicWave) {
            this.setPeriodicWave(options.periodicWave);
        }

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined) this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        const validTypes = ['sine', 'square', 'sawtooth', 'triangle'];
        if (!validTypes.includes(value)) {
            throw new Error(`Invalid oscillator type: ${value}`);
        }
        this._type = value;
        this.context._engine.setNodeParameter(this._nodeId, 'type', validTypes.indexOf(value));
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

        if (this.onended) {
            const stopTime = (when - this.context.currentTime) * 1000;
            setTimeout(
                () => {
                    if (this.onended) {
                        this.onended({ target: this });
                    }
                },
                Math.max(0, stopTime)
            );
        }
    }

    setPeriodicWave(periodicWave) {
        if (!periodicWave || !periodicWave.wavetable) {
            throw new TypeError('setPeriodicWave requires a PeriodicWave object');
        }

        this._type = 'custom';
        this.context._engine.setNodePeriodicWave(this._nodeId, periodicWave.wavetable);
    }
}
