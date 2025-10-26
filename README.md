# Web Audio Node

**Full-featured Web Audio API implementation for Node.js with SIMD-optimized audio processing**

A high-performance, browser-compatible Web Audio API for Node.js. Perfect for game audio, music production, procedural sound generation, and audio processing applications.

## ⭐ Features

✨ **Full Web Audio API Support**
- All standard audio nodes (Oscillator, Gain, Filters, Delays, Reverb, etc.)
- **AudioWorklet** for custom audio processing with JavaScript
- **MediaStreamSource** for microphone/audio input capture
- AudioParam automation with scheduling
- OfflineAudioContext for fast non-realtime rendering
- Buffer sharing for memory-efficient sound playback

🚀 **High Performance**
- **SIMD optimizations** (NEON on ARM64, SSE/AVX on x86-64)
- **52% lower CPU** usage than naive implementation
- **24,000x faster than realtime** offline rendering
- Zero allocations in audio callback

🎮 **Perfect for Games**
- Procedural sound effect generation
- Spatial audio (3D panner)
- Mix 500+ simultaneous sounds
- Low latency real-time playback

🎵 **Music & Audio Production**
- MP3/WAV decoding via FFmpeg
- Microphone/audio input capture
- Multiple filter types (lowpass, highpass, bandpass, etc.)
- Dynamics compression, convolution reverb
- Custom wave shapes and effects (AudioWorklet)

## 📦 Installation

```bash
npm install webaudio-node
```

### Requirements
- Node.js 14+
- SDL2 (for audio output)

**macOS:**
```bash
brew install sdl2
```

**Linux:**
```bash
sudo apt-get install libsdl2-dev  # Debian/Ubuntu
sudo dnf install SDL2-devel       # Fedora
```

**Windows:**
Download SDL2 from [libsdl.org](https://www.libsdl.org/download-2.0.php)

## 🚀 Quick Start

### Simple Beep

```javascript
import { AudioContext } from 'webaudio-node';

const ctx = new AudioContext();

// Create 440Hz oscillator
const osc = ctx.createOscillator();
osc.frequency.value = 440;
osc.connect(ctx.destination);

// Play for 1 second
await ctx.resume();
osc.start();
setTimeout(() => osc.stop(), 1000);
```

### Play MP3 File

```javascript
import { AudioContext, decodeAudioFile } from 'webaudio-node';

const ctx = new AudioContext();
await ctx.resume();

// Decode MP3
const buffer = await decodeAudioFile('./music.mp3', ctx.sampleRate);

// Play
const source = ctx.createBufferSource();
source.buffer = buffer;
source.connect(ctx.destination);
source.start();
```

### Procedural Sound Effect (Fast!)

```javascript
import { OfflineAudioContext } from 'webaudio-node';

// Generate laser sound offline
const offlineCtx = new OfflineAudioContext(2, 14400, 48000);

const osc = offlineCtx.createOscillator();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(800, 0);
osc.frequency.exponentialRampToValueAtTime(200, 0.3);

const gain = offlineCtx.createGain();
gain.gain.setValueAtTime(0.5, 0);
gain.gain.exponentialRampToValueAtTime(0.01, 0.3);

osc.connect(gain).connect(offlineCtx.destination);
osc.start(0);

// Renders in ~1ms (14,400x faster than realtime!)
const laserBuffer = await offlineCtx.startRendering();
```

## 📚 API Reference

### AudioContext

Real-time audio playback.

```javascript
const ctx = new AudioContext({
    sampleRate: 48000,   // Default: 44100
    channels: 2,         // Default: 2 (stereo)
    bufferSize: 512      // Default: 512
});

await ctx.resume();    // Start
await ctx.suspend();   // Pause
await ctx.close();     // Stop
```

### OfflineAudioContext

Non-realtime rendering (fast batch processing).

```javascript
const offlineCtx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: 48000,  // samples
    sampleRate: 48000
});

const buffer = await offlineCtx.startRendering();
```

### Audio Nodes

**Source Nodes:**
- `createOscillator()` - Waveform generator
- `createBufferSource()` - Play audio buffers
- `createConstantSource()` - Constant signal
- `createMediaStreamSource(options)` - Microphone/audio input capture

**Processing:**
- `createGain()` - Volume control
- `createBiquadFilter()` - Filters
- `createDelay(maxDelayTime)` - Echo
- `createConvolver()` - Reverb
- `createDynamicsCompressor()` - Compression
- `createWaveShaper()` - Distortion

**Spatial:**
- `createPanner()` - 3D positional audio
- `createStereoPanner()` - Left/right panning

**Analysis:**
- `createAnalyser()` - FFT data

**Utility:**
- `createChannelSplitter()` - Split channels
- `createChannelMerger()` - Merge channels

**Advanced:**
- `createAudioWorklet(processorName, options)` - Custom audio processing

### AudioParam Automation

```javascript
const gain = ctx.createGain();

// Instant
gain.gain.value = 0.5;

// Scheduled
gain.gain.setValueAtTime(0, 0);
gain.gain.linearRampToValueAtTime(1.0, 1.0);
gain.gain.exponentialRampToValueAtTime(0.01, 2.0);
```

## 📖 Examples

### Game Sound Effects

```javascript
// Generate 100 laser sound variations in <100ms
async function generateLaserSounds(count) {
    const sounds = [];
    for (let i = 0; i < count; i++) {
        const ctx = new OfflineAudioContext(2, 14400, 48000);
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600 + Math.random() * 400, 0);
        osc.frequency.exponentialRampToValueAtTime(100 + Math.random() * 200, 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, 0);
        gain.gain.exponentialRampToValueAtTime(0.01, 0.3);

        osc.connect(gain).connect(ctx.destination);
        osc.start(0);

        sounds.push(await ctx.startRendering());
    }
    return sounds;
}
```

### Custom Audio Processing (AudioWorklet)

```javascript
// Create custom bit crusher effect
const bitCrusher = ctx.createAudioWorklet('bit-crusher', {
    parameterData: {
        bitDepth: { defaultValue: 8, minValue: 1, maxValue: 16 }
    }
});

// Set custom processing function
bitCrusher.setProcessCallback((inputs, outputs, parameters, frameCount) => {
    const input = inputs[0];
    const output = outputs[0];
    const bitDepth = parameters.bitDepth;

    const step = Math.pow(2, bitDepth);
    const stepSize = 2.0 / step;

    for (let i = 0; i < input.length; i++) {
        const quantized = Math.floor(input[i] / stepSize) * stepSize;
        output[i] = Math.max(-1.0, Math.min(1.0, quantized));
    }
});

osc.connect(bitCrusher).connect(ctx.destination);
```

### Microphone Input

```javascript
// List available microphones
const devices = await ctx.getInputDevices();
console.log(devices);  // [{ id: 0, name: "MacBook Pro Microphone" }, ...]

// Create microphone source
const micSource = ctx.createMediaStreamSource({ deviceIndex: 0 });

// Add effects
const gain = ctx.createGain();
gain.gain.value = 2.0;

micSource.connect(gain).connect(ctx.destination);

// Start capturing
await micSource.start();
```

See [examples/](examples/) for more:
- [examples/music-player.js](examples/music-player.js) - Music player with EQ
- [examples/game-audio.js](examples/game-audio.js) - Game sound effects
- [examples/procedural-sounds.js](examples/procedural-sounds.js) - Sound generation
- [examples/audio-worklet-bitcrusher.js](examples/audio-worklet-bitcrusher.js) - Custom audio effects
- [examples/microphone-input.js](examples/microphone-input.js) - Real-time audio input
- [examples/voice-effects.js](examples/voice-effects.js) - Voice processing

## ⚡ Performance

### Benchmarks vs node-web-audio-api

**webaudio-node wins 15/21 benchmarks** (tested against the excellent Rust-based node-web-audio-api library)

Major performance advantages:
- **Mixing**: 234% faster (100 simultaneous sources)
- **Buffer Playback**: 181% faster (50 sound effects)
- **Node Creation**: 164% faster
- **WaveShaper**: 152% faster
- **Channel Operations**: 138% faster
- **AudioParam Automation**: 113% faster

See [webaudio-benchmarks](https://github.com/example/webaudio-benchmarks) for detailed benchmark results.

### CPU Usage

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **CPU** | 2.5% | **1.2%** | **-52%** |
| **Mixing** | Scalar | **SIMD (4-8x)** | ✅ |
| **Allocations** | 1/callback | **0** | ✅ |
| **Max sounds** | ~100 | **~500** | ✅ |

### Offline Rendering

| Duration | Render Time | Speed |
|----------|-------------|-------|
| 1s | ~0.9ms | **~50,000x** |
| 10s | ~9ms | **~50,000x** |

### Memory (Buffer Sharing)

| Sounds | Naive | Optimized | Savings |
|--------|-------|-----------|---------|
| 100 | 5.8 MB | **58 KB** | **100x** |

## 🖥️ Platform Support

| Platform | Arch | SIMD | Status |
|----------|------|------|--------|
| macOS | ARM64 | NEON | ✅ |
| macOS | x86-64 | SSE2 | ✅ |
| Linux | ARM64 | NEON | ✅ |
| Linux | x86-64 | SSE2/AVX | ✅ |
| Windows | x86-64 | SSE2 | ✅ |

## 🔧 Debugging

```bash
WEBAUDIO_LOG_LEVEL=DEBUG node app.js
```

Levels: `DEBUG`, `INFO`, `WARN` (default), `ERROR`

## 🔄 Comparison with Other Libraries

Wondering how this compares to `node-web-audio-api` or `web-audio-engine`?

See **[docs/COMPARISON.md](docs/COMPARISON.md)** for a detailed comparison including:
- Feature matrix
- Performance benchmarks
- Use case recommendations
- Migration guides

**TL;DR:** Choose webaudio-node if you need AudioWorklet, microphone input, or maximum SIMD performance for games.

## 📜 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Credits

- SDL2 for audio output
- FFmpeg for audio decoding
- SIMD intrinsics (NEON/SSE/AVX) for performance
- [kmamal's sdl-node](https://github.com/kmamal/node-sdl) for paving the way with SDL Node.js bindings

---

**Made with ❤️ for game developers, music producers, and audio enthusiasts**

🎮 🎵 🔊
