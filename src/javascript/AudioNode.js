export class AudioNode {
    constructor(context, nodeId) {
        this.context = context;
        this._nodeId = nodeId;
        this.numberOfInputs = 0;
        this.numberOfOutputs = 1;
        this.channelCount = 2;
        this.channelCountMode = 'explicit';
        this.channelInterpretation = 'speakers';
    }

    connect(destination, outputIndex = 0, inputIndex = 0) {
        // Check if destination is an AudioParam
        if (destination._paramName) {
            // Connecting to AudioParam
            this.context._engine.connectToParam(
                this._nodeId,
                destination._nodeId,
                destination._paramName,
                outputIndex
            );
            return destination;
        }

        // Regular node connection
        if (destination.context !== this.context) {
            throw new Error('Cannot connect nodes from different contexts');
        }

        this.context._engine.connectNodes(
            this._nodeId,
            destination._nodeId,
            outputIndex,
            inputIndex
        );

        return destination;
    }

    disconnect(destination) {
        if (destination) {
            this.context._engine.disconnectNodes(this._nodeId, destination._nodeId);
        } else {
            this.context._engine.disconnectNodes(this._nodeId);
        }
    }
}
