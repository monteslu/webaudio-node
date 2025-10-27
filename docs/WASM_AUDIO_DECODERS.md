# WASM Audio Decoders

High-performance audio format decoders compiled to WebAssembly for fast, native-speed audio decoding without FFmpeg dependency.

## Supported Formats

**267KB WASM bundle** with 5 audio codecs providing Chrome parity for static audio playback:

| Format         | Decoder Library | File Extensions | Description                   |
| -------------- | --------------- | --------------- | ----------------------------- |
| **MP3**        | dr_mp3          | `.mp3`          | Most widely used lossy format |
| **WAV**        | dr_wav          | `.wav`          | Uncompressed PCM audio        |
| **FLAC**       | dr_flac         | `.flac`         | Lossless compression          |
| **OGG/Vorbis** | stb_vorbis      | `.ogg`          | Open-source lossy format      |
| **AAC**        | uaac            | `.aac`, `.m4a`  | Apple/YouTube standard        |

## Usage

### Basic Decoding

```javascript
import { WasmAudioDecoders } from './src/wasm-integration/WasmAudioDecoders.js';
import { readFile } from 'fs/promises';

// Load audio file
const audioData = await readFile('audio.mp3');

// Decode MP3
const result = await WasmAudioDecoders.decodeMP3(audioData.buffer);

console.log(`Sample rate: ${result.sampleRate} Hz`);
console.log(`Channels: ${result.channels}`);
console.log(`Duration: ${result.length / result.sampleRate} seconds`);
console.log(`Audio data: Float32Array[${result.audioData.length}]`);
```

### Auto-Detection

The decoder can automatically detect format from magic bytes:

```javascript
// Automatically detects MP3/WAV/FLAC/OGG/AAC
const result = await WasmAudioDecoders.decode(audioData.buffer);
```

### Format-Specific Decoding

```javascript
// Decode specific formats
await WasmAudioDecoders.decodeMP3(buffer);
await WasmAudioDecoders.decodeWAV(buffer);
await WasmAudioDecoders.decodeFLAC(buffer);
await WasmAudioDecoders.decodeVorbis(buffer); // For .ogg files
await WasmAudioDecoders.decodeAAC(buffer);
```

## Output Format

All decoders return the same structure:

```javascript
{
  audioData: Float32Array,  // Interleaved samples [L, R, L, R, ...]
  sampleRate: number,       // Sample rate in Hz (e.g., 44100)
  channels: number,         // 1 (mono) or 2 (stereo)
  length: number            // Number of frames (samples / channels)
}
```

## Performance vs Rust

Benchmarks comparing WASM decoders against Rust (node-web-audio-api):

| Format   | WASM (median) | Rust (median) | Winner                  |
| -------- | ------------- | ------------- | ----------------------- |
| **WAV**  | 3.7ms         | 13.9ms        | **WASM 3.75x faster** ✓ |
| **FLAC** | 43.3ms        | 69.6ms        | **WASM 1.61x faster** ✓ |
| **MP3**  | 47.4ms        | 44.1ms        | Rust 1.07x faster       |
| **OGG**  | 63.4ms        | 44.1ms        | Rust 1.44x faster       |
| **AAC**  | 70.4ms        | 46.4ms        | Rust 1.52x faster       |

_Benchmarked on 54-second stereo audio file (rising_sun.mp3)_

## Building

```bash
# Build WASM decoders
./scripts/build-decoders.sh

# Output:
# - dist/audio_decoders.wasm (267KB)
# - dist/audio_decoders.mjs (JS glue code)
```

## Architecture

### Decoder Libraries

- **dr_mp3, dr_wav, dr_flac**: Public domain single-header libraries by mackron
- **stb_vorbis**: Public domain Vorbis decoder by Sean Barrett
- **uaac**: RPSL-licensed AAC decoder (slibs)

### Build Process

1. C++ wrapper in `src/wasm/audio_decoders.cpp` provides unified API
2. Compiled with Emscripten to WebAssembly
3. JavaScript bindings in `src/wasm-integration/WasmAudioDecoders.js`
4. Auto-detection via magic byte checking

### Magic Bytes

- **MP3**: `0xFF 0xFx` or `ID3` tag
- **WAV**: `RIFF`
- **FLAC**: `fLaC`
- **OGG**: `OggS`
- **AAC**: `0xFF 0xFx` (ADTS sync word)

## Testing

```bash
# Test all 5 formats
node test-all-formats.js

# Run decoder benchmarks
cd ../webaudio-benchmarks
node bench-decoder-formats.js
```

## Why Not Opus?

Opus would require:

- 206+ source files (libopus + libogg + opusfile)
- 200-300KB additional WASM size
- Complex multi-library build system

**Opus use cases:**

- WebRTC (real-time) - uses raw packets, not .opus files
- YouTube server-side encoding
- `.opus` files are rare vs MP3/AAC/OGG

**Our 5 formats provide Chrome parity for static audio playback** - the primary use case for file-based decoders.

## File Size

| Component           | Size      | Notes               |
| ------------------- | --------- | ------------------- |
| audio_decoders.wasm | 267KB     | All 5 decoders      |
| audio_decoders.mjs  | 12KB      | JS glue code        |
| **Total**           | **279KB** | vs ~50MB for FFmpeg |

## Future Optimizations

Potential improvements:

- SIMD optimizations for specific codecs
- Streaming decode (chunk-by-chunk)
- WebCodecs API integration
- Opus support (if demand increases)

## License

Decoders use various licenses:

- dr_libs (MP3/WAV/FLAC): Public Domain
- stb_vorbis (OGG): Public Domain
- uaac (AAC): RPSL license

See individual library headers for details.
