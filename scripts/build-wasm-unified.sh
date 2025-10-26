#!/bin/bash

# Build unified WASM module with AudioGraph

set -e

echo "Building WebAudio WASM module with AudioGraph..."

# Source emsdk environment quietly
if [ -f "$HOME/code/audio/emsdk/emsdk_env.sh" ]; then
    source "$HOME/code/audio/emsdk/emsdk_env.sh" > /dev/null 2>&1
elif [ -f "$HOME/emsdk/emsdk_env.sh" ]; then
    source "$HOME/emsdk/emsdk_env.sh" > /dev/null 2>&1
else
    echo "Error: emsdk not found"
    exit 1
fi

# Output directory
OUTPUT_DIR="dist"
mkdir -p "$OUTPUT_DIR"

# Core implementation files
CORE_FILES=(
    "src/native/audio_param.cpp"
    "src/native/utils/mixer.cpp"
    "src/native/utils/fft.cpp"
)

# All node implementation files
NODE_FILES=(
    "src/native/nodes/audio_node.cpp"
    "src/native/nodes/destination_node.cpp"
    "src/native/nodes/buffer_source_node.cpp"
    "src/native/nodes/gain_node.cpp"
    "src/native/nodes/oscillator_node.cpp"
    "src/native/nodes/biquad_filter_node.cpp"
    "src/native/nodes/delay_node.cpp"
    "src/native/nodes/stereo_panner_node.cpp"
    "src/native/nodes/constant_source_node.cpp"
    "src/native/nodes/channel_splitter_node.cpp"
    "src/native/nodes/channel_merger_node.cpp"
    "src/native/nodes/analyser_node.cpp"
    "src/native/nodes/dynamics_compressor_node.cpp"
    "src/native/nodes/wave_shaper_node.cpp"
    "src/native/nodes/convolver_node.cpp"
    "src/native/nodes/panner_node.cpp"
    "src/native/nodes/iir_filter_node.cpp"
    "src/native/nodes/audio_worklet_node.cpp"
    "src/native/nodes/media_stream_source_node.cpp"
)

# Compiler flags
CXXFLAGS="-O3 -std=c++17 -sASSERTIONS=1"

# SIMD flags for ARM NEON (translates to WASM SIMD)
CXXFLAGS="$CXXFLAGS -msimd128"

# Include directories
INCLUDES="-I."

# Exported functions (C API for JavaScript)
EXPORTED_FUNCTIONS='[
    "_createAudioGraph",
    "_destroyAudioGraph",
    "_createNode",
    "_connectNodes",
    "_connectToParam",
    "_disconnectNodes",
    "_startNode",
    "_stopNode",
    "_setNodeParameter",
    "_setNodeBuffer",
    "_registerBuffer",
    "_setNodeBufferId",
    "_setNodeStringProperty",
    "_setWaveShaperCurve",
    "_setNodePeriodicWave",
    "_setNodeProperty",
    "_scheduleParameterValue",
    "_scheduleParameterRamp",
    "_processGraph",
    "_getCurrentTime",
    "_malloc",
    "_free"
]'

# Exported runtime methods
EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "HEAPF32", "stringToUTF8", "lengthBytesUTF8"]'

echo "Compiling AudioGraph and all nodes..."
emcc $CXXFLAGS $INCLUDES \
    src/wasm/audio_graph_wasm.cpp \
    "${CORE_FILES[@]}" \
    "${NODE_FILES[@]}" \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS" \
    -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME_METHODS" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=268435456 \
    -s MAXIMUM_MEMORY=4294967296 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME="createWebAudioModule" \
    -s ENVIRONMENT=node \
    -o "$OUTPUT_DIR/webaudio.mjs"

echo "✓ WASM build complete!"
echo "  Output: $OUTPUT_DIR/webaudio.mjs (JS glue)"
echo "  Output: $OUTPUT_DIR/webaudio.wasm (WASM binary)"
ls -lh "$OUTPUT_DIR/webaudio.mjs" "$OUTPUT_DIR/webaudio.wasm"
