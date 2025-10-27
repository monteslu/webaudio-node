# Audio Threading Architecture

## Overview

This document explains the different approaches to real-time audio rendering, the challenges we encountered, and our implementation plan.

## Background: How Audio Rendering Works

### Browser Architecture (Chrome/Firefox)

Browsers use a **true real-time audio architecture**:

```
┌─────────────────────┐         ┌──────────────────────┐
│   Main JS Thread    │         │  Real-Time Audio     │
│                     │         │  Thread (C++)        │
│  - Web Audio API    │         │                      │
│  - AudioWorklet     │◄────────┤  - Audio Graph       │
│  - DOM/UI           │  Pull   │  - 128-frame blocks  │
│                     │  Model  │  - ~3ms intervals    │
└─────────────────────┘         └──────────────────────┘
```

**Key features:**

- **Separate real-time thread** with guaranteed CPU priority
- **Pull-based rendering** - audio thread pulls frames from graph every ~3ms
- **Native C++ implementation** - no JavaScript timing issues
- **AudioWorklet** - runs custom processing on the audio thread

### ScriptProcessorNode (Deprecated)

The old `ScriptProcessorNode` tried to run callbacks on the **main JavaScript thread**:

```
┌─────────────────────┐
│   Main JS Thread    │
│                     │
│  - Audio Callbacks  │  ❌ Timing issues
│  - DOM/UI           │  ❌ Main thread blocking
│  - Event loop       │  ❌ Glitches & dropouts
└─────────────────────┘
```

**Why it failed:**

- JavaScript event loop timing not precise enough for audio (need ~3ms precision)
- Main thread blocking from UI/DOM events caused audio glitches
- No CPU priority guarantees
- This is why it was deprecated in favor of AudioWorklet

## Our Implementations

### Native C++ Implementation

Our native implementation (`src/native/`) uses **SDL audio callbacks**, which run on a separate real-time thread:

```cpp
// src/native/AudioContext.cpp
void AudioContext::AudioCallback(void* userdata, uint8_t* stream, int len) {
    // This runs ON SDL's real-time audio thread
    AudioContext* context = static_cast<AudioContext*>(userdata);
    context->destination_->Process(/* ... */);
}
```

**Architecture:**

```
┌─────────────────────┐         ┌──────────────────────┐
│   Node.js Thread    │         │  SDL Audio Thread    │
│                     │         │  (Real-Time)         │
│  - JavaScript API   │         │                      │
│  - Node bindings    │◄────────┤  - Audio Callback    │
│                     │  Pull   │  - C++ Graph         │
└─────────────────────┘         └──────────────────────┘
```

**Benefits:**

- ✅ True real-time audio thread
- ✅ Guaranteed CPU priority
- ✅ No JavaScript timing issues
- ✅ Works exactly like browsers

### WASM Implementation - Current (Chunk-Ahead Buffering)

**Problem:** WASM runs in the JavaScript VM, so we can't create real-time audio threads.

**Solution:** Render large chunks well ahead of playback (game audio pattern):

```
┌─────────────────────────────────────────────┐
│   Main Thread (JavaScript + WASM)          │
│                                             │
│  ┌─────────────┐      ┌─────────────┐      │
│  │ WASM Engine │─────▶│ SDL Queue   │      │
│  │  (Render    │ 2sec │  (3sec      │      │
│  │   chunks)   │      │   buffer)   │      │
│  └─────────────┘      └─────────────┘      │
│        ▲                      │             │
│        │                      ▼             │
│        │              Audio Hardware        │
│        │                                    │
│  Check every 500ms:                         │
│  if queue < 1s → render 2s more             │
└─────────────────────────────────────────────┘
```

**Implementation details:**

- Pre-render 2 seconds before playback starts
- 3-second SDL buffer for smooth playback
- Monitor every 500ms and render more chunks when queue < 1 second
- Stays 1-2 seconds ahead of playback at all times

**Code:**

```javascript
async resume() {
    // 3-second buffer
    this._audioDevice = sdl.audio.openDevice({
        buffered: this.sampleRate * this._channels * 4 * 3,
    });

    // Pre-render 2 seconds
    this._renderAndEnqueueChunk(this.sampleRate * 2);

    this._audioDevice.play();
    this._monitorLoop(); // Check every 500ms
}

_monitorLoop() {
    const queuedSeconds = this._audioDevice.queued / (this.sampleRate * this._channels * 4);

    if (queuedSeconds < 1.0) {
        this._renderAndEnqueueChunk(this.sampleRate * 2); // Render 2s more
    }

    setTimeout(() => this._monitorLoop(), 500);
}
```

**Benefits:**

- ✅ Simple implementation
- ✅ No tight timing requirements
- ✅ Standard pattern for games and Node.js audio
- ✅ Works reliably

**Tradeoffs:**

- ⚠️ Higher latency (1-2 seconds)
- ⚠️ Not suitable for interactive audio (games with immediate feedback)
- ⚠️ Uses more memory (large pre-rendered buffers)

### @kmamal/node-sdl Limitations

The `@kmamal/sdl` binding only exposes **queue-based API**, not callbacks:

```javascript
// ❌ Not available in @kmamal/sdl JavaScript binding
audioDevice = sdl.audio.openDevice({}, samples => {
    // Callback never fires
});

// ✅ Available - queue-based API
audioDevice = sdl.audio.openDevice({});
audioDevice.enqueue(buffer);
```

**Why:** The binding author chose to only expose SDL's queue API (`SDL_QueueAudio`), not the callback API.

This is actually fine - the queue API is what games use, and chunk-ahead buffering is the correct pattern.

## Audio Decoding (Current Limitation)

Audio decoding via `decodeAudioData()` is currently **synchronous/blocking**:

```javascript
// Blocks event loop during decode (but very fast with WASM)
const buffer = await ctx.decodeAudioData(audioData.buffer);
```

**Current behavior:**

- Methods are marked `async` for API compatibility
- WASM decoding functions are synchronous calls
- Small files (< 5MB): Negligible blocking (< 10ms)
- Large files (> 50MB): Could block for 100-500ms

**Future improvement:**
Could be offloaded to Worker Thread using rawr RPC for true non-blocking decoding, but not a priority since WASM decoding is already very fast. When Worker Thread rendering is implemented, the same rawr infrastructure can be reused for decode operations.

## Future Plan: Worker Thread Implementation

For lower latency and better architecture, we can use **Node.js Worker Threads** with **rawr** for RPC communication:

```
┌─────────────────────┐         ┌──────────────────────┐
│   Main Thread       │         │   Worker Thread      │
│                     │         │                      │
│  - SDL Device       │         │  - WASM Engine       │
│  - enqueue()        │◄────────┤  - Continuous render │
│  - Node API         │  rawr   │  - setInterval(0)    │
│                     │  RPC    │                      │
└─────────────────────┘         └──────────────────────┘
```

### Architecture with rawr RPC

We'll use **[rawr](https://github.com/iceddev/rawr)** (battle-tested RPC library) to abstract Worker Thread communication instead of manual postMessage handling.

**Worker Thread (wasm-audio-worker.js):**

```javascript
import { Worker } from 'node:worker_threads';
import rawr from 'rawr';
import { worker as workerTransport } from 'rawr/transports';
import { WasmAudioEngine } from './WasmAudioEngine.js';

const engine = new WasmAudioEngine(channels, length, sampleRate);
let running = false;

// Export methods that main thread can call
const workerPeer = rawr({
    transport: workerTransport(),
    methods: {
        createNode(type, options) {
            return engine.createNode(type, options);
        },

        connectNodes(sourceId, destId, sourceOutput, destInput) {
            engine.connectNodes(sourceId, destId, sourceOutput, destInput);
        },

        setNodeParameter(nodeId, paramName, value) {
            engine.setNodeParameter(nodeId, paramName, value);
        },

        start() {
            running = true;
        },

        stop() {
            running = false;
        }
    }
});

// Continuous rendering loop (like @kmamal/sdl example 16)
setInterval(() => {
    if (!running) return;

    const numFrames = calculateFramesNeeded();
    const audioChunk = new Float32Array(numFrames * channels);

    engine.renderBlock(audioChunk, numFrames);

    // Send audio to main thread via rawr
    workerPeer.enqueueAudio(audioChunk.buffer, [audioChunk.buffer]);
}, 0);
```

**Main Thread (WasmAudioContext.js):**

```javascript
import { Worker } from 'node:worker_threads';
import rawr from 'rawr';
import { worker as workerTransport } from 'rawr/transports';
import sdl from '@kmamal/sdl';

async resume() {
    // Open SDL device
    this._audioDevice = sdl.audio.openDevice({
        channels: this._channels,
        sampleRate: this.sampleRate,
        buffered: this.sampleRate * this._channels * 4 * 3 // 3 second buffer
    });

    // Create worker with rawr RPC
    const worker = new Worker('./wasm-audio-worker.js', {
        workerData: {
            channels: this._channels,
            sampleRate: this.sampleRate
        }
    });

    this._workerPeer = rawr({
        transport: workerTransport(worker),
        methods: {
            // Worker can call this to send audio chunks
            enqueueAudio(arrayBuffer) {
                this._audioDevice.enqueue(Buffer.from(arrayBuffer));
            }
        }
    });

    // Clean RPC calls instead of manual messaging
    await this._workerPeer.start();
    this._audioDevice.play();
}

// Node creation becomes simple RPC calls
createOscillator() {
    const nodeId = await this._workerPeer.createNode('oscillator');
    return new OscillatorNode(this, nodeId);
}
```

### Benefits

- ✅ **Lower latency** - can render smaller chunks more frequently
- ✅ **Better architecture** - separates rendering from I/O
- ✅ **Non-blocking** - rendering doesn't block main thread
- ✅ **More browser-like** - similar to AudioWorklet pattern
- ✅ **Proven pattern** - @kmamal/sdl example 16 demonstrates this works
- ✅ **Clean RPC abstraction** - rawr eliminates manual postMessage/on('message') boilerplate
- ✅ **Bidirectional calls** - worker can call main thread methods easily
- ✅ **Battle-tested** - rawr is production-proven in real-world applications
- ✅ **SharedArrayBuffer support** - enables true zero-copy audio streaming via ring buffer
    - No memory allocations during rendering
    - No data copying between threads
    - Optimal performance for continuous audio streaming

### Challenges

1. **ES Module loading in workers** - need proper configuration
2. **Async/sync bridging** - Web Audio API is synchronous, but RPC calls are async
    - Solution: Cache node IDs and parameters on main thread, send commands async
3. **Audio buffer streaming** - need efficient way to stream audio from worker to main thread
    - rawr supports **SharedArrayBuffer** for true zero-copy memory sharing
    - Alternative: Transferable ArrayBuffers (transfers ownership)

### Implementation Plan

**Phase 1: Proof of Concept**

- Install rawr as dependency
- Create simple worker that renders sine wave using rawr RPC
- Verify rawr communication and timing
- Measure latency and performance vs chunk-ahead buffering

**Phase 2: Full Integration**

- Implement all node creation/connection methods via rawr
- Handle AudioParam automation commands
- Implement start/stop lifecycle management
- Add proper error handling across RPC boundary

**Phase 3: Optimization**

- Tune chunk sizes for latency vs performance
- Implement **SharedArrayBuffer ring buffer** for zero-copy audio streaming
    - Worker writes audio to shared ring buffer
    - Main thread reads from ring buffer and enqueues to SDL
    - No memory copies or transfers needed
- Add monitoring and diagnostics
- Compare performance with native C++ implementation

**Phase 4: Audio Decoding (Optional)**

- Offload `decodeAudioData()` to worker for non-blocking operation
- Reuse rawr infrastructure for decode RPC calls

## Comparison Matrix

| Feature          | Native C++    | WASM Chunk-Ahead  | WASM Worker Thread |
| ---------------- | ------------- | ----------------- | ------------------ |
| **Latency**      | ~3ms          | 1-2s              | ~100ms             |
| **Timing**       | SDL RT thread | setTimeout(500ms) | setInterval(0)     |
| **Complexity**   | Medium        | Simple            | High               |
| **CPU Priority** | Real-time     | Normal            | Normal             |
| **Use Cases**    | All           | Background music  | Most audio         |
| **Status**       | ✅ Production | ✅ Production     | 🚧 Future          |

## Why Games Use Chunk-Ahead Buffering

Games always pre-load and pre-render audio because:

1. **Avoids latency spikes** - pre-loading eliminates loading delays
2. **No tight timing** - large buffers tolerate frame drops
3. **Simple** - fewer failure points than streaming
4. **Predictable** - known memory/CPU usage

This is why our current WASM implementation works well - it follows proven game audio patterns.

## References

- [Web Audio API Spec - AudioWorklet](https://webaudio.github.io/web-audio-api/#AudioWorklet)
- [@kmamal/sdl Example 16 - Audio Thread](https://github.com/kmamal/node-sdl/tree/master/examples/16-audio-thread)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [SDL Audio Documentation](https://wiki.libsdl.org/SDL_AudioSpec)
- [rawr - RPC library for Worker Threads](https://github.com/iceddev/rawr)
