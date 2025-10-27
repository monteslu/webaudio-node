import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class OscillatorNode extends AudioNode {
    constructor(context) {
        const nodeId = context._engine.createNode('oscillator', { type: 'sine' });
        super(context, nodeId);

        this.numberOfInputs = 0;
        this.numberOfOutputs = 1;

        this.frequency = new AudioParam(
            context,
            nodeId,
            'frequency',
            440.0,
            0.0,
            context.sampleRate / 2
        );
        this.detune = new AudioParam(context, nodeId, 'detune', 0.0, -4800.0, 4800.0);

        this._type = 'sine';
        this._started = false;
        this._stopped = false;
        this.onended = null;
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
