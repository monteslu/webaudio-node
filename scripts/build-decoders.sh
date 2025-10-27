#!/bin/bash

# Build audio decoders WASM module

set -e

echo "Building Audio Decoders WASM module..."

# Source emsdk environment quietly
# Check if emcc is already available (e.g., from GitHub Actions setup-emsdk)
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
    echo "Please install emsdk or ensure emcc is in PATH"
    exit 1
fi

# Output directory
OUTPUT_DIR="dist"
mkdir -p "$OUTPUT_DIR"

# Compiler flags
# Enable SIMD for Speex resampler (SSE on x86, NEON on ARM)
CXXFLAGS="-O3 -std=c++17 -D__i386__ -Wno-narrowing -msimd128"

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
    "_resampleAudio",
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
