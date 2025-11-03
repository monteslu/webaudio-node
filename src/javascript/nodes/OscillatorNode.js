import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class OscillatorNode extends AudioNode {
    constructor(context, options = {}) {
        // Apply options using destructuring defaults
        const {
            type = 'sine',
            frequency = 440.0,
            detune = 0.0,
            periodicWave,
            channelCount,
            channelCountMode,
            channelInterpretation
        } = options;

        const nodeId = context._engine.createNode('oscillator', { ...options, type });
        super(context, nodeId);

        this.numberOfInputs = 0;
        this.numberOfOutputs = 1;

        this.frequency = new AudioParam(
            context,
            nodeId,
            'frequency',
            frequency,
            0.0,
            context.sampleRate / 2
        );
        this.detune = new AudioParam(context, nodeId, 'detune', detune, -4800.0, 4800.0);

        this._type = type;
        this._started = false;
        this._stopped = false;
        this.onended = null;

        // Apply periodicWave if provided
        if (periodicWave) {
            this.setPeriodicWave(periodicWave);
        }

        // Apply channel config from options
        if (channelCount !== undefined) this.channelCount = channelCount;
        if (channelCountMode !== undefined) this.channelCountMode = channelCountMode;
        if (channelInterpretation !== undefined) this.channelInterpretation = channelInterpretation;
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

        // Auto-resume context if suspended (browser-like behavior)
        // Note: We call resume() but don't await it to match browser behavior
        // Only auto-resume for real-time contexts (not OfflineAudioContext)
        // OfflineAudioContext has startRendering() method, real-time contexts don't
        if (
            this.context.state === 'suspended' &&
            typeof this.context.resume === 'function' &&
            typeof this.context.startRendering !== 'function'
        ) {
            this.context.resume().catch(err => {
                console.error('[OscillatorNode] Failed to auto-resume:', err);
            });
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
