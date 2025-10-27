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

    disconnect(destinationOrOutput, output, input) {
        // Case 1: disconnect() - disconnect all
        if (destinationOrOutput === undefined) {
            this.context._engine.disconnectNodes(this._nodeId);
            return;
        }

        // Case 2: disconnect(output) - disconnect specific output index
        if (typeof destinationOrOutput === 'number') {
            this.context._engine.disconnectOutput(this._nodeId, destinationOrOutput);
            return;
        }

        // Case 3: disconnect(destination) - disconnect from node/param
        if (output === undefined) {
            if (destinationOrOutput._paramName) {
                // Disconnecting from AudioParam
                this.context._engine.disconnectFromParam(
                    this._nodeId,
                    destinationOrOutput._nodeId,
                    destinationOrOutput._paramName
                );
            } else {
                // Disconnecting from AudioNode
                this.context._engine.disconnectNodes(this._nodeId, destinationOrOutput._nodeId);
            }
            return;
        }

        // Case 4: disconnect(destination, output) or disconnect(destination, output, input)
        if (destinationOrOutput._paramName) {
            // AudioParam doesn't support input parameter
            this.context._engine.disconnectFromParam(
                this._nodeId,
                destinationOrOutput._nodeId,
                destinationOrOutput._paramName,
                output
            );
        } else {
            // AudioNode with optional input
            this.context._engine.disconnectNodes(
                this._nodeId,
                destinationOrOutput._nodeId,
                output,
                input
            );
        }
    }
}
