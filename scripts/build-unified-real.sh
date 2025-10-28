#!/bin/bash

# Build TRULY unified WASM module
# ONE file with: audio graph + all nodes + decoders

set -e

echo "Building UNIFIED WASM module (graph + nodes + decoders)..."

# Source emsdk environment quietly
if command -v emcc > /dev/null 2>&1; then
    echo "✓ emcc found in PATH"
elif [ -n "$EMSDK" ] && [ -f "$EMSDK/emsdk_env.sh" ]; then
    echo "✓ Sourcing emsdk from EMSDK env var: $EMSDK"
    source "$EMSDK/emsdk_env.sh" > /dev/null 2>&1
elif [ -f "$HOME/code/audio/emsdk/emsdk_env.sh" ]; then
    echo "✓ Sourcing emsdk from $HOME/code/audio/emsdk"
    source "$HOME/code/audio/emsdk/emsdk_env.sh" > /dev/null 2>&1
elif [ -f "$HOME/emsdk/emsdk_env.sh" ]; then
    echo "✓ Sourcing emsdk from $HOME/emsdk"
    source "$HOME/emsdk/emsdk_env.sh" > /dev/null 2>&1
else
    echo "Error: emsdk not found"
    exit 1
fi

OUTPUT_DIR="dist"
mkdir -p "$OUTPUT_DIR"

# Compiler flags - optimized with SIMD
# -msimd128: Enable WASM SIMD
# -msse -msse2: Enable SSE/SSE2 intrinsics (emulated to WASM SIMD by Emscripten)
# -D__i386__: Required by uaac.h AAC decoder
# -DDR_MP3_FLOAT_OUTPUT: Optimize dr_mp3 for float output (matches our use case)
# -DDR_MP3_ONLY_SIMD: Skip CPU detection, always use SIMD paths (we know WASM SIMD is available)
CXXFLAGS="-O3 -std=c++17 -msimd128 -msse -msse2 -D__i386__ -DDR_MP3_FLOAT_OUTPUT -DDR_MP3_ONLY_SIMD -Wno-narrowing"

# Include directories
INCLUDES="-I. -Isrc/vendor"

# ALL exported functions (graph + nodes + decoders + media stream)
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
    "_setWaveShaperOversample",
    "_setNodePeriodicWave",
    "_setNodeProperty",
    "_scheduleParameterValue",
    "_scheduleParameterRamp",
    "_processGraph",
    "_getGraphCurrentTime",
    "_setGraphCurrentTime",
    "_decodeMP3",
    "_decodeWAV",
    "_decodeFLAC",
    "_decodeVorbis",
    "_decodeAAC",
    "_decodeAudio",
    "_resampleAudio",
    "_freeDecodedBuffer",
    "_createMediaStreamSourceNode",
    "_destroyMediaStreamSourceNode",
    "_startMediaStreamSource",
    "_stopMediaStreamSource",
    "_writeInputData",
    "_getInputDataAvailable",
    "_processMediaStreamSourceNode",
    "_malloc",
    "_free"
]'

EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "HEAPU8", "HEAPU32", "HEAP32", "HEAPF32", "stringToUTF8", "lengthBytesUTF8"]'

echo "Compiling unified WASM: graph + all nodes + decoders..."
echo "This may take a minute due to audio decoder libraries..."

# Compile everything together - ALL nodes + utils + graph + decoders + media stream
emcc $CXXFLAGS $INCLUDES \
    src/wasm/utils/fft.cpp \
    src/wasm/nodes/oscillator_node.cpp \
    src/wasm/nodes/gain_node.cpp \
    src/wasm/nodes/buffer_source_node.cpp \
    src/wasm/nodes/biquad_filter_node.cpp \
    src/wasm/nodes/delay_node.cpp \
    src/wasm/nodes/wave_shaper_node.cpp \
    src/wasm/nodes/stereo_panner_node.cpp \
    src/wasm/nodes/constant_source_node.cpp \
    src/wasm/nodes/convolver_node.cpp \
    src/wasm/nodes/dynamics_compressor_node.cpp \
    src/wasm/nodes/analyser_node.cpp \
    src/wasm/nodes/panner_node.cpp \
    src/wasm/nodes/iir_filter_node.cpp \
    src/wasm/nodes/channel_splitter_node.cpp \
    src/wasm/nodes/channel_merger_node.cpp \
    src/wasm/audio_graph_simple.cpp \
    src/wasm/media_stream_source.cpp \
    src/wasm/audio_decoders.cpp \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS" \
    -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME_METHODS" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=268435456 \
    -s MAXIMUM_MEMORY=4294967296 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME="createUnifiedWebAudioModule" \
    -s ENVIRONMENT=node \
    -o "$OUTPUT_DIR/webaudio.mjs"

echo "✓ Unified WASM build complete!"
echo "  Output: $OUTPUT_DIR/webaudio.mjs (JS glue)"
echo "  Output: $OUTPUT_DIR/webaudio.wasm (WASM binary)"
ls -lh "$OUTPUT_DIR/webaudio.mjs" "$OUTPUT_DIR/webaudio.wasm"

# Remove old audio_decoders files
if [ -f "$OUTPUT_DIR/audio_decoders.mjs" ]; then
    echo ""
    echo "Removing old separate decoder files..."
    rm -f "$OUTPUT_DIR/audio_decoders.mjs" "$OUTPUT_DIR/audio_decoders.wasm"
    echo "✓ Cleanup complete - now using single unified WASM"
fi
