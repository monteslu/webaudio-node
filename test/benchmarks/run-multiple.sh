#!/bin/bash

# Utility script to run a command multiple times
# Usage: ./run-multiple.sh <iterations> <command>
# Example: ./run-multiple.sh 5 "node run-benchmarks.js | grep 'Heavy Processing'"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <iterations> <command>"
    exit 1
fi

ITERATIONS=$1
shift
COMMAND="$@"

for i in $(seq 1 $ITERATIONS); do
    echo "=== Run $i ==="
    eval "$COMMAND"
done
