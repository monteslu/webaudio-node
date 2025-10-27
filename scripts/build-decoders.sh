#!/bin/bash

# Build audio decoders WASM module

set -e

echo "Building Audio Decoders WASM module..."

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

# Compiler flags
CXXFLAGS="-O3 -std=c++17 -D__i386__ -Wno-narrowing"

# Include directories
INCLUDES="-I. -Isrc/vendor"

# Exported functions
EXPORTED_FUNCTIONS='[
    "_decodeMP3",
    "_decodeWAV",
    "_decodeFLAC",
    "_decodeVorbis",
    "_decodeAAC",
    "_decodeAudio",
    "_freeDecodedBuffer",
    "_malloc",
    "_free"
]'

# Exported runtime methods
EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "HEAPU8", "HEAPU32", "HEAP32", "HEAPF32"]'

echo "Compiling audio decoders..."
emcc $CXXFLAGS $INCLUDES \
    src/wasm/audio_decoders.cpp \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS" \
    -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME_METHODS" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME="createAudioDecodersModule" \
    -s ENVIRONMENT=node \
    -o "$OUTPUT_DIR/audio_decoders.mjs"

echo "✓ Audio decoders WASM build complete!"
echo "  Output: $OUTPUT_DIR/audio_decoders.mjs (JS glue)"
echo "  Output: $OUTPUT_DIR/audio_decoders.wasm (WASM binary)"
ls -lh "$OUTPUT_DIR/audio_decoders.mjs" "$OUTPUT_DIR/audio_decoders.wasm"
