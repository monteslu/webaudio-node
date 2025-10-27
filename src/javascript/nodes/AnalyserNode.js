import { AudioNode } from '../AudioNode.js';

export class AnalyserNode extends AudioNode {
    constructor(context, options = {}) {
        const nodeId = context._engine.createNode('analyser', options);
        super(context, nodeId);

        this._fftSize = options.fftSize || 2048;
        this._minDecibels = options.minDecibels !== undefined ? options.minDecibels : -100;
        this._maxDecibels = options.maxDecibels !== undefined ? options.maxDecibels : -30;
        this._smoothingTimeConstant =
            options.smoothingTimeConstant !== undefined ? options.smoothingTimeConstant : 0.8;

        // Apply channel config from options
        if (options.channelCount !== undefined) this.channelCount = options.channelCount;
        if (options.channelCountMode !== undefined)
            this.channelCountMode = options.channelCountMode;
        if (options.channelInterpretation !== undefined)
            this.channelInterpretation = options.channelInterpretation;
    }

    get fftSize() {
        return this._fftSize;
    }

    set fftSize(value) {
        if (value < 32 || value > 32768) {
            throw new Error('fftSize must be between 32 and 32768');
        }
        // Ensure power of 2
        let powerOf2 = 32;
        while (powerOf2 < value) {
            powerOf2 *= 2;
        }
        this._fftSize = powerOf2;
        this.context._engine.setAnalyserFFTSize(this._nodeId, powerOf2);
    }

    get frequencyBinCount() {
        return this._fftSize / 2;
    }

    get minDecibels() {
        return this._minDecibels;
    }

    set minDecibels(value) {
        if (value >= this._maxDecibels) {
            throw new Error('minDecibels must be less than maxDecibels');
        }
        this._minDecibels = value;
        this.context._engine.setAnalyserMinDecibels(this._nodeId, value);
    }

    get maxDecibels() {
        return this._maxDecibels;
    }

    set maxDecibels(value) {
        if (value <= this._minDecibels) {
            throw new Error('maxDecibels must be greater than minDecibels');
        }
        this._maxDecibels = value;
        this.context._engine.setAnalyserMaxDecibels(this._nodeId, value);
    }

    get smoothingTimeConstant() {
        return this._smoothingTimeConstant;
    }

    set smoothingTimeConstant(value) {
        if (value < 0 || value > 1) {
            throw new Error('smoothingTimeConstant must be between 0 and 1');
        }
        this._smoothingTimeConstant = value;
        this.context._engine.setAnalyserSmoothingTimeConstant(this._nodeId, value);
    }

    getFloatFrequencyData(array) {
        if (!(array instanceof Float32Array)) {
            throw new TypeError('array must be a Float32Array');
        }
        this.context._engine.getFloatFrequencyData(this._nodeId, array);
    }

    getByteFrequencyData(array) {
        if (!(array instanceof Uint8Array)) {
            throw new TypeError('array must be a Uint8Array');
        }
        this.context._engine.getByteFrequencyData(this._nodeId, array);
    }

    getFloatTimeDomainData(array) {
        if (!(array instanceof Float32Array)) {
            throw new TypeError('array must be a Float32Array');
        }
        this.context._engine.getFloatTimeDomainData(this._nodeId, array);
    }

    getByteTimeDomainData(array) {
        if (!(array instanceof Uint8Array)) {
            throw new TypeError('array must be a Uint8Array');
        }
        this.context._engine.getByteTimeDomainData(this._nodeId, array);
    }
}
