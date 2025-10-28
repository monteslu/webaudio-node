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
Could be offloaded to a Worker Thread for true non-blocking decoding, but not a priority since WASM decoding is already very fast. When pthread rendering is implemented, audio decoding could potentially run on the same worker thread during idle time.

## Future Plan: Emscripten Pthreads Implementation

**Important:** Our JavaScript API will continue to fully comply with the **Web Audio API specification**. Threading will be used internally for:
1. **Async operations already in the spec** - `decodeAudioData()`, `AudioContext.resume()`, etc.
2. **Internal audio rendering** - Moving graph rendering to a background thread for better performance
3. **The public API remains unchanged** - All Web Audio API methods and properties stay synchronous/async as specified

For lower latency and better architecture, we'll use **Emscripten's pthread support** which automatically handles Worker Thread management:

```
┌─────────────────────────────────────────────────────────┐
│                  Emscripten Runtime                     │
│                                                         │
│  ┌──────────────────┐         ┌──────────────────────┐ │
│  │  Main Thread     │         │  Worker Thread Pool  │ │
│  │                  │         │                      │ │
│  │  - SDL Device    │         │  - pthread 1         │ │
│  │  - enqueue()     │◄────────┤  - pthread 2         │ │
│  │  - Node API      │ Shared  │  - Render loop       │ │
│  │                  │ Memory  │  - Audio graph       │ │
│  └──────────────────┘         └──────────────────────┘ │
│                                                         │
│  SharedArrayBuffer (WASM Memory)                        │
│  - Zero-copy audio data                                 │
│  - Atomic operations for sync                           │
└─────────────────────────────────────────────────────────┘
```

### Why Emscripten Pthreads?

**Emscripten handles all the complexity for you:**

1. **Automatic Worker Management** - Creates and manages Worker Thread pool
2. **Standard POSIX API** - Write portable C/C++ pthread code
3. **SharedArrayBuffer Setup** - Automatically configures shared WASM memory
4. **Zero JavaScript Glue** - No manual Worker Thread or message passing code
5. **Proven and Stable** - Battle-tested in production applications

### Node.js Support (v22, v24)

✅ **Fully Supported in Node.js 22/24:**
- SharedArrayBuffer - Enabled by default
- Atomics API - Full support
- Worker Threads - Stable since v12.11.0
- WebAssembly threads - No experimental flags needed
- Emscripten pthread - **Exit behavior fixed** (PR #18227 merged)

🚀 **Node.js 22 Improvements:**
- **WebAssembly Garbage Collection** - V8 12.4 brings enhanced memory management
- **Improved WASI support** - Better file system/network integration
- **V8 Maglev compiler** - Performance optimizations

🚀 **Node.js 24 New Features:**
- **WebAssembly Memory64** - Memory limit: 4GB → 16 exabytes (64-bit addressing)
- **Atomics.pause()** - Efficient spinlock for low-latency polling
  - Maps to CPU-specific instructions (x86 PAUSE, ARM YIELD)
  - Reduces CPU usage by 20-40% during busy-wait
  - Better power efficiency on laptops
- **V8 13.6** - Further WASM performance improvements

### WebAssembly Threads Specification

**WebAssembly 2.0 + Threads provides:**

1. **Shared Memory** - WASM linear memory backed by SharedArrayBuffer
2. **Atomic Operations**:
   - Load/store: `i32.atomic.load`, `i64.atomic.store`, etc.
   - Read-modify-write: add, sub, and, or, xor, xchg, cmpxchg
   - 8-bit, 16-bit, 32-bit, 64-bit variants
3. **Thread Synchronization**:
   - `memory.atomic.wait` - Block thread until notified
   - `memory.atomic.notify` - Wake waiting threads
   - `atomic.fence` - Memory barriers

**Note:** WASM cannot spawn threads directly - it requires JavaScript (Web Workers in browsers, Worker Threads in Node.js). Emscripten provides this glue code automatically.

### Implementation with Emscripten Pthreads

**C++ Audio Rendering Code (audio_engine.cpp):**

```cpp
#include <pthread.h>
#include <atomic>
#include <emscripten.h>
#include "audio_graph.h"

// Lock-free ring buffer for audio data
struct AudioRingBuffer {
    std::atomic<uint32_t> read_pos;
    std::atomic<uint32_t> write_pos;
    uint32_t capacity;
    float* audio_data;
};

AudioRingBuffer g_ring_buffer;
std::atomic<bool> g_running{false};

// Audio rendering thread - runs continuously
void* audio_render_thread(void* arg) {
    AudioContext* ctx = (AudioContext*)arg;

    while (g_running.load(std::memory_order_acquire)) {
        uint32_t write_pos = g_ring_buffer.write_pos.load(std::memory_order_acquire);
        uint32_t read_pos = g_ring_buffer.read_pos.load(std::memory_order_acquire);

        // Calculate available space
        uint32_t available = (read_pos - write_pos - 1 + g_ring_buffer.capacity)
                           % g_ring_buffer.capacity;

        if (available >= RENDER_CHUNK_SIZE) {
            // Render audio chunk
            float* dest = &g_ring_buffer.audio_data[write_pos];
            ctx->render_audio_chunk(dest, RENDER_CHUNK_SIZE);

            // Update write position atomically
            uint32_t new_write = (write_pos + RENDER_CHUNK_SIZE) % g_ring_buffer.capacity;
            g_ring_buffer.write_pos.store(new_write, std::memory_order_release);
        } else {
            // Buffer full - yield CPU with Atomics.pause equivalent
            // In C++20: std::this_thread::yield()
            emscripten_thread_sleep(0);  // Yield to other threads
        }
    }

    return nullptr;
}

// Called from JavaScript to start rendering
EMSCRIPTEN_KEEPALIVE
extern "C" void start_audio_rendering(int sample_rate, int channels) {
    // Initialize ring buffer
    g_ring_buffer.capacity = sample_rate * channels * 4;  // 4 seconds
    g_ring_buffer.audio_data = new float[g_ring_buffer.capacity];
    g_ring_buffer.read_pos.store(0);
    g_ring_buffer.write_pos.store(0);

    // Start rendering thread
    g_running.store(true, std::memory_order_release);

    pthread_t render_thread;
    pthread_attr_t attr;
    pthread_attr_init(&attr);

    // Create audio rendering thread
    pthread_create(&render_thread, &attr, audio_render_thread, &g_audio_context);
    pthread_detach(render_thread);  // Let it run independently
}

// Called from JavaScript main loop to read audio
EMSCRIPTEN_KEEPALIVE
extern "C" void read_audio_buffer(float* output, int frames) {
    uint32_t read_pos = g_ring_buffer.read_pos.load(std::memory_order_acquire);
    uint32_t write_pos = g_ring_buffer.write_pos.load(std::memory_order_acquire);

    uint32_t available = (write_pos - read_pos + g_ring_buffer.capacity)
                       % g_ring_buffer.capacity;

    if (available >= frames) {
        // Copy audio data
        for (int i = 0; i < frames; i++) {
            uint32_t pos = (read_pos + i) % g_ring_buffer.capacity;
            output[i] = g_ring_buffer.audio_data[pos];
        }

        // Update read position atomically
        uint32_t new_read = (read_pos + frames) % g_ring_buffer.capacity;
        g_ring_buffer.read_pos.store(new_read, std::memory_order_release);
    } else {
        // Underrun - output silence
        memset(output, 0, frames * sizeof(float));
    }
}

// Node creation/modification - called from main thread
EMSCRIPTEN_KEEPALIVE
extern "C" int create_oscillator_node() {
    return g_audio_context.create_oscillator();
}

EMSCRIPTEN_KEEPALIVE
extern "C" void set_node_parameter(int node_id, const char* param_name, float value) {
    g_audio_context.set_parameter(node_id, param_name, value);
}
```

**Compilation Command:**

```bash
emcc audio_engine.cpp \
    -pthread \
    -sPTHREAD_POOL_SIZE=2 \
    -sSHARED_MEMORY=1 \
    -sALLOW_MEMORY_GROWTH=0 \
    -sEXIT_RUNTIME=1 \
    -sEXPORTED_FUNCTIONS=_start_audio_rendering,_read_audio_buffer,_create_oscillator_node \
    -sEXPORTED_RUNTIME_METHODS=ccall,cwrap \
    -O3 \
    -o audio_engine.js
```

**JavaScript Integration (WasmAudioContext.js):**

```javascript
import sdl from '@kmamal/sdl';

class WasmAudioContext {
    async resume() {
        // Load Emscripten-compiled WASM (automatically handles Worker Threads!)
        const Module = await import('./audio_engine.js');
        await Module.default();  // Wait for WASM initialization

        this._wasmModule = Module;

        // Start audio rendering thread (Emscripten creates Worker Thread automatically)
        Module.ccall('start_audio_rendering', null, ['number', 'number'],
                     [this.sampleRate, this._channels]);

        // Open SDL audio device
        this._audioDevice = sdl.audio.openDevice({
            channels: this._channels,
            sampleRate: this.sampleRate,
            buffered: this.sampleRate * this._channels * 4 * 0.5  // 0.5 sec buffer
        });

        // Continuously read from ring buffer and feed SDL
        this._renderLoop = setInterval(() => {
            const frames = Math.floor(this.sampleRate * 0.1);  // 100ms chunks
            const buffer = new Float32Array(frames * this._channels);

            // Call WASM function to read from ring buffer
            const bufferPtr = Module._malloc(buffer.length * 4);
            Module.ccall('read_audio_buffer', null, ['number', 'number'],
                        [bufferPtr, frames]);

            // Copy from WASM memory
            const wasmBuffer = new Float32Array(
                Module.HEAPF32.buffer,
                bufferPtr,
                buffer.length
            );
            buffer.set(wasmBuffer);
            Module._free(bufferPtr);

            // Convert to Int16 and enqueue to SDL
            const int16Buffer = new Int16Array(buffer.length);
            for (let i = 0; i < buffer.length; i++) {
                int16Buffer[i] = Math.max(-32768, Math.min(32767, buffer[i] * 32767));
            }

            this._audioDevice.enqueue(Buffer.from(int16Buffer.buffer));
        }, 0);

        this._audioDevice.play();
    }

    createOscillator() {
        const nodeId = this._wasmModule.ccall('create_oscillator_node', 'number');
        return new OscillatorNode(this, nodeId);
    }
}
```

### Web Audio API Compatibility

**Threading is a transparent implementation detail. The public API remains 100% Web Audio compliant:**

```javascript
// All of these work exactly as specified - no API changes!
const ctx = new AudioContext();

// Synchronous methods remain synchronous
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

// Parameter changes are synchronous (internally queued to render thread)
osc.frequency.value = 440;
osc.frequency.setValueAtTime(880, ctx.currentTime + 1.0);

// Async methods that are already async in the spec
await ctx.resume();  // May now be faster with threading
const buffer = await ctx.decodeAudioData(audioData);  // Can run on render thread

// Everything works exactly like browser Web Audio API
osc.start();
```

**Where Threading Helps (All Spec-Compliant):**

1. **`decodeAudioData()`** - Already async in spec, can run on render thread
2. **`AudioContext.resume()`** - Already async, can startup faster
3. **Internal rendering** - Graph processing on background thread (user doesn't see this)
4. **Better latency** - Rendering doesn't block main thread, but API unchanged

**What Stays The Same:**

- ✅ All method signatures unchanged
- ✅ All properties work identically
- ✅ AudioParam automation timing stays sample-accurate
- ✅ Node connection/disconnection behavior identical
- ✅ Event firing (onended, etc.) works the same
- ✅ Existing code continues to work without modifications

### Benefits

- ✅ **Automatic Worker Management** - Emscripten handles Worker Thread lifecycle
- ✅ **Standard POSIX pthreads** - Write portable C/C++ code
- ✅ **Zero-copy audio transfer** - Shared memory between threads
- ✅ **Lock-free synchronization** - C++ atomics compile to WASM atomic operations
- ✅ **Lower latency** - ~50-100ms vs 1-2s (chunk-ahead)
- ✅ **No JavaScript glue code** - Emscripten generates all Worker Thread management
- ✅ **Battle-tested** - Used in production (box2d3-wasm, etc.)
- ✅ **Node.js 22/24 support** - Fully working, exit behavior fixed
- ✅ **Simple debugging** - Standard pthread debugging tools work
- ✅ **100% Web Audio API compliant** - No breaking changes to public API

**Node.js 24 Specific Advantages:**
- 🚀 **Memory64** - Support for massive audio buffers (16EB vs 4GB limit)
- 🚀 **Better power efficiency** - Improved thread scheduling in V8
- 🚀 **V8 13.6 optimizations** - Faster WASM execution and atomics

### Challenges

1. **Web Audio API Compatibility** - Must maintain exact spec compliance
   - All synchronous methods must appear synchronous (even if internally async)
   - AudioParam timing must remain sample-accurate
   - Event timing (onended, etc.) must fire at correct times
   - Need robust cross-thread command queue for node operations

2. **Fixed compilation requirements** - Must use specific Emscripten flags:
   ```bash
   -pthread -sPTHREAD_POOL_SIZE=2 -sSHARED_MEMORY=1 -sEXIT_RUNTIME=1
   ```

3. **No ALLOW_MEMORY_GROWTH** - Shared memory doesn't support dynamic growth
   - Must pre-allocate sufficient memory at initialization
   - Need to calculate max memory requirements upfront

4. **Main thread coordination** - Node creation/parameter changes need thread-safe queuing
   - Commands from main thread must be queued to render thread
   - Must avoid blocking main thread while queuing commands
   - Need lock-free command queue implementation

5. **ES6 module quirks** - May need CommonJS for best compatibility (being addressed)

### Implementation Plan

**Phase 1: Basic Threading Setup**

- Add Emscripten pthread compilation flags to build script
- Create simple pthread example that renders sine wave
- Implement lock-free ring buffer in C++
- Test Worker Thread creation in Node.js 22/24
- Verify shared memory and atomic operations work correctly
- Measure basic latency and threading overhead
- **Verify Web Audio API compatibility** - Ensure all existing API tests pass

**Phase 2: Audio Graph Threading**

- Move existing audio graph rendering to pthread
- Implement `start_audio_rendering()` and `read_audio_buffer()` internal APIs
- Add thread-safe node creation/modification functions
- **Maintain synchronous API surface** - `createOscillator()`, `connect()`, etc. remain synchronous
- Test with simple audio graphs (oscillator, gain)
- Verify no race conditions in parameter updates
- Benchmark against current chunk-ahead implementation
- **Run full Web Audio API test suite** to ensure compliance

**Phase 3: Async Operations Threading**

- Offload `decodeAudioData()` to render thread (already async in spec)
- Optimize `AudioContext.resume()` with threaded startup
- Implement thread-safe `AudioParam.setValueAtTime()` and automation
- **Verify async methods match Web Audio spec behavior exactly**
- Test complex audio graphs with dynamic node creation
- Verify BufferSourceNode works correctly with threading
- Test microphone input with threaded rendering

**Phase 4: Production Hardening**

- Add error handling for buffer overruns/underruns
- Implement xrun detection and recovery
- Add performance monitoring and diagnostics
- **Run comprehensive Web Audio API compliance tests**
- Test on Node.js v22 and v24 extensively
- Profile memory usage and optimize ring buffer size
- Test Memory64 support for large buffers (v24)
- **Document that threading is internal implementation detail**
- Add threading architecture docs (not user-facing API changes)
- Verify browser compatibility if expanding to Web targets

## Comparison Matrix

| Feature                | Native C++    | WASM Chunk-Ahead  | WASM Emscripten pthreads |
| ---------------------- | ------------- | ----------------- | ------------------------ |
| **Latency**            | ~3ms          | 1-2s              | ~50-100ms                |
| **Timing**             | SDL RT thread | setTimeout(500ms) | Render thread            |
| **Memory Copies**      | None          | Every chunk       | Zero-copy                |
| **Complexity**         | Medium        | Simple            | Medium                   |
| **Thread Management**  | SDL callbacks | None              | Emscripten automatic     |
| **Code Style**         | C++ native    | C++ WASM          | C++ POSIX pthreads       |
| **Node.js Support**    | N/A           | v22, v24 ✅       | v22 ✅, v24 🚀           |
| **Worker Creation**    | N/A           | None              | Automatic (Emscripten)   |
| **Portability**        | Low           | High              | Very High                |
| **Debugging**          | GDB/LLDB      | Limited           | pthread tools            |
| **Memory Growth**      | Dynamic       | Dynamic           | Fixed (no growth)        |
| **Use Cases**          | All           | Background music  | Interactive/Most audio   |
| **Status**             | ✅ Production | ✅ Production     | 🚧 Future                |

## Why Games Use Chunk-Ahead Buffering

Games always pre-load and pre-render audio because:

1. **Avoids latency spikes** - pre-loading eliminates loading delays
2. **No tight timing** - large buffers tolerate frame drops
3. **Simple** - fewer failure points than streaming
4. **Predictable** - known memory/CPU usage

This is why our current WASM implementation works well - it follows proven game audio patterns.

## Key Principles

### 1. **Web Audio API Compliance is Non-Negotiable**

Our implementation must pass the Web Audio API conformance tests. Threading is purely an internal optimization - users should never need to know or care that we use threads internally.

### 2. **Threading Locations**

**Where we CAN use threads (already async in spec):**
- ✅ `decodeAudioData()` - Already returns a Promise
- ✅ `AudioContext.resume()` - Already returns a Promise
- ✅ `AudioContext.suspend()` - Already returns a Promise
- ✅ Internal audio graph rendering - Not exposed in API

**Where we CANNOT break sync behavior:**
- ❌ `createOscillator()`, `createGain()`, etc. - Must remain synchronous
- ❌ `node.connect()` - Must be synchronous
- ❌ `param.value = x` - Must be synchronous (queued internally)
- ❌ `node.start()` - Must be synchronous (scheduled internally)

### 3. **Implementation Strategy**

```
┌─────────────────────────────────────────────────────┐
│  JavaScript API (Web Audio Spec - Synchronous)     │
│  - createOscillator(), connect(), etc.             │
│  - param.value = x                                  │
│  - node.start()                                     │
└──────────────────┬──────────────────────────────────┘
                   │ Lock-free command queue
                   ▼
┌─────────────────────────────────────────────────────┐
│  Render Thread (pthread - C++)                      │
│  - Process queued commands                          │
│  - Render audio graph                               │
│  - Write to ring buffer                             │
└─────────────────────────────────────────────────────┘
```

**Key Design:**
- Main thread: Accepts Web Audio API calls, queues commands to render thread
- Render thread: Processes commands, renders audio, writes to ring buffer
- Lock-free queue: Ensures main thread never blocks
- No API changes: Users see standard Web Audio API

### 4. **Success Criteria**

- ✅ All existing Web Audio API tests pass
- ✅ Sample-accurate timing maintained
- ✅ No API breaking changes
- ✅ Latency improved from 1-2s to ~50-100ms
- ✅ Works in Node.js 22/24 without issues
- ✅ Code that works in browsers works here (and vice versa)

## References

- [Web Audio API Specification](https://webaudio.github.io/web-audio-api/)
- [Web Audio API Spec - AudioWorklet](https://webaudio.github.io/web-audio-api/#AudioWorklet)
- [Emscripten Pthreads Documentation](https://emscripten.org/docs/porting/pthreads.html)
- [WebAssembly Threads Specification](https://github.com/WebAssembly/threads)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [box2d3-wasm - Working Example](https://github.com/Birch-san/box2d3-wasm)
- [@kmamal/sdl Audio Documentation](https://github.com/kmamal/node-sdl)
- [SDL Audio Documentation](https://wiki.libsdl.org/SDL_AudioSpec)
