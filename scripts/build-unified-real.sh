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
# -DDR_MP3_FLOAT_OUTPUT: Optimize dr_mp3 for float output (matches our use case)
# -DDR_MP3_ONLY_SIMD: Skip CPU detection, always use SIMD paths (we know WASM SIMD is available)
# -D__i386__: makes dr_mp3 take its x86 SSE path under emscripten (also was needed
# by the old uaac decoder, now removed — but dr_mp3 still wants it).
CXXFLAGS="-O3 -std=c++17 -msimd128 -msse -msse2 -D__i386__ -DDR_MP3_FLOAT_OUTPUT -DDR_MP3_ONLY_SIMD -Wno-narrowing"

# Include directories for the C++ engine (audio_decoders.cpp pulls the codec public
# headers, so add those here too — but the engine build keeps -Isrc/vendor for dr_*).
INCLUDES="-I. -Isrc/vendor \
  -Isrc/vendor/ogg/include -Isrc/vendor/opus/include \
  -Isrc/vendor/opusfile/include \
  -Isrc/vendor/libxaac/decoder"

# Codec-only include set. Opus's own headers (celt/arch.h etc.) MUST shadow the
# speex resampler's src/vendor/arch.h, so opus dirs go first and there is NO bare
# -Isrc/vendor here.
CODEC_INCLUDES="-Isrc/vendor/opus/celt -Isrc/vendor/opus/silk \
  -Isrc/vendor/opus/silk/float -Isrc/vendor/opus/include -Isrc/vendor/opus \
  -Isrc/vendor/ogg/include \
  -Isrc/vendor/opusfile/include -Isrc/vendor/opusfile/src \
  -Isrc/vendor/libxaac/decoder -Isrc/vendor/libxaac/decoder/drc_src -Isrc/vendor/libxaac/common"

# Codec source list (opus + ogg + opusfile + libxaac), generated into
# scripts/codec_sources.txt. Built as plain C; see CODEC_CFLAGS below.
CODEC_SOURCES="$(tr '\n' ' ' < scripts/codec_sources.txt)"

# Per-codec C flags compiled into the same module:
#  - OPUS_BUILD + VAR_ARRAYS: opus build defines (no config.h — we pass the few
#    defines directly so no generated config file is needed under emcc).
#  - OP_ENABLE_HTTP=0 / OP_FIXED_POINT=0: opusfile memory-decode only, float out
#  - -U__ARM_NEON__: libxaac's generic selector self-disables under __ARM_NEON__;
#    we use the pure-C generic path, so force it on.
#  - -w: silence the vendored C's strict warnings (incompatible-pointer-types etc.)
CODEC_CFLAGS="-O3 -DOPUS_BUILD=1 -DVAR_ARRAYS=1 -DFLOATING_POINT=1 \
  -DOP_ENABLE_HTTP=0 -DOP_FIXED_POINT=0 -U__ARM_NEON__ -w \
  -Wno-error=incompatible-function-pointer-types -Wno-incompatible-function-pointer-types \
  -Wno-error=incompatible-pointer-types -Wno-incompatible-pointer-types \
  -Wno-error=implicit-function-declaration -Wno-implicit-function-declaration"

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
    "_scheduleParamEvent",
    "_processGraph",
    "_deinterleaveAudio",
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

# Stage 1: compile the codec sources (opus/ogg/opusfile/libxaac) into a static lib
# with their own C flags (CODEC_CFLAGS), so their strict-warning + config needs
# don't leak into the C++ engine build. Compile each .c to a .o in a temp dir
# (flattened names to avoid collisions), then archive.
echo "Compiling Opus/AAC codec lib ($(wc -w <<< "$CODEC_SOURCES") sources)..."
CODEC_AR="$OUTPUT_DIR/libcodecs.a"
CODEC_OBJ_DIR="$OUTPUT_DIR/codec-obj"
rm -rf "$CODEC_OBJ_DIR"; mkdir -p "$CODEC_OBJ_DIR"
for src in $CODEC_SOURCES; do
    obj="$CODEC_OBJ_DIR/$(echo "$src" | tr '/.' '__').o"
    emcc $CODEC_CFLAGS $CODEC_INCLUDES -msimd128 -c "$src" -o "$obj" || { echo "codec compile failed: $src"; exit 1; }
done
rm -f "$CODEC_AR"
emar rcs "$CODEC_AR" "$CODEC_OBJ_DIR"/*.o

# Stage 2: compile everything together - ALL nodes + utils + graph + decoders +
# media stream + the codec lib.
emcc $CXXFLAGS $INCLUDES \
    src/wasm/utils/fft.cpp \
    src/wasm/utils/audio_param.cpp \
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
    "$CODEC_AR" \
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
