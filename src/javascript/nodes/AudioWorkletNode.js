import { AudioNode } from '../AudioNode.js';
import { AudioParam } from '../AudioParam.js';

export class AudioWorkletNode extends AudioNode {
    constructor(context, processorName, options = {}) {
        if (!processorName || typeof processorName !== 'string') {
            throw new TypeError('AudioWorkletNode requires a processorName string');
        }

        const nodeId = context._engine.createNode('audioworklet', { processorName });
        super(context, nodeId);

        this.numberOfInputs = options.numberOfInputs || 1;
        this.numberOfOutputs = options.numberOfOutputs || 1;

        this._processorName = processorName;
        this._parameters = new Map();

        // Create AudioParams from parameterData
        if (options.parameterData) {
            for (const [name, paramInfo] of Object.entries(options.parameterData)) {
                const defaultValue = paramInfo.defaultValue || 0;
                const minValue = paramInfo.minValue || -3.4028235e38;
                const maxValue = paramInfo.maxValue || 3.4028235e38;

                // Add parameter to C++ node
                context._engine.addWorkletParameter(nodeId, name, defaultValue, minValue, maxValue);

                // Create JavaScript AudioParam wrapper
                this._parameters.set(name, new AudioParam(context, nodeId, name, defaultValue, minValue, maxValue));
            }
        }

        this._processCallback = null;
    }

    get parameters() {
        // Return a read-only map of parameters
        return this._parameters;
    }

    get processorName() {
        return this._processorName;
    }

    // Set the process callback (simplified implementation)
    // In full Web Audio spec, this would be done via AudioWorkletGlobalScope.registerProcessor
    setProcessCallback(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('Process callback must be a function');
        }

        this._processCallback = callback;
        this.context._engine.setWorkletProcessCallback(this._nodeId, callback);
    }
}
