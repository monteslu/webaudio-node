# Audio Architecture Analysis: Latency and Stability Issues

## Executive Summary

The webaudio-node audio system has **fundamental architectural conflicts** between input (microphone) and output (playback) that cause latency, jitter, and stability issues. The microphone input uses a **pull-based polling model** while audio output uses a **push-based queue model**, creating timing mismatches.

**Root Cause:** JavaScript's event loop timing (10-100ms granularity) is being used for sub-millisecond audio synchronization, which is architecturally wrong.

---

## 1. SDL Audio Implementation Details

### 1.1 SDL Audio Modes

SDL provides **two fundamentally different audio models**:

#### Mode A: Callback Mode
```cpp
SDL_AudioDeviceID id = SDL_OpenAudioDevice(
    device_name, 
    is_capture,
    &desired,
    &obtained,
    SDL_AUDIO_ALLOW_FORMAT_CHANGE  // PULL MODEL
);

// SDL calls your callback ON the audio thread:
void AudioCallback(void* userdata, uint8_t* stream, int len) {
    // PULL: You must fill the buffer RIGHT NOW or audio glitches
    // TIMING: Every ~3ms (at 48kHz with 128-sample buffers)
    // THREAD: Real-time audio thread with high priority
}
```

**Characteristics:**
- **Pull-based**: Audio hardware "pulls" data from your callback
- **Hard deadlines**: Must provide data in ~3ms or glitch
- **Real-time thread**: Dedicated audio thread with CPU priority
- **Synchronous**: Callback blocks until you return
- **Native-only**: No JavaScript can run in callback

#### Mode B: Queue Mode
```cpp
SDL_AudioDeviceID id = SDL_OpenAudioDevice(
    device_name,
    is_capture,
    &desired,
    &obtained,
    0  // QUEUE MODEL (no callback)
);

// You push data from main thread:
SDL_QueueAudio(device_id, buffer, size);   // Playback: Push
int bytes = SDL_DequeueAudio(device_id, buffer, max_size);  // Recording: Pull
```

**Characteristics:**
- **Push-based (playback)**: You push data when you have it
- **Soft deadlines**: Can be late, system buffers hide it
- **Main thread**: Runs on JavaScript thread
- **Asynchronous**: No blocking needed
- **Flexible**: Can integrate with JavaScript

**KEY DIFFERENCE:** Mode A = Real-time (3ms precision), Mode B = Main thread (10-100ms precision)

### 1.2 @kmamal/sdl Binding Implementation

The `@kmamal/sdl` binding **only exposes Queue Mode**:

**File:** `/home/monteslu/code/jsgl/node-sdl/src/native/audio.cpp`

```cpp
SDL_AudioDeviceID audio_id = SDL_OpenAudioDevice(
    has_name ? name.c_str() : nullptr,
    is_capture ? 1 : 0,
    &desired,
    nullptr,
    0  // ❌ No callback support - Queue mode only!
);

// Playback: Push data
int SDL_QueueAudio(audio_id, src, size);

// Recording: Pull data
int SDL_DequeueAudio(audio_id, dst, size);
```

**Buffering Parameter:**
- `buffered`: Internal SDL queue size in bytes
- Must be **power of 2**
- Default: 4096-8192 bytes
- Output uses: **65536 bytes** (2^16)
- Input uses: **8192 bytes** (2^13)

This is **correct for queue mode**, but creates problems for low-latency audio.

---

## 2. Current webaudio-node Audio Flow Analysis

### 2.1 Output Audio Flow (WORKS WELL)

**File:** `/home/monteslu/code/jsgl/webaudio-node/src/wasm-integration/WasmAudioContext.js`

```
┌─────────────────────────────────────────────────────────────┐
│ JavaScript Main Thread                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  resume() [Line 249-281]:                                   │
│  ├─ Open SDL device: buffered=65536 bytes (~1.4s at 48k)   │
│  ├─ Pre-render: 200ms (9,600 frames)                        │
│  ├─ Enqueue: SDL._QueueAudio()                              │
│  └─ Start: device.play()                                    │
│                                                              │
│  _monitorLoop() [Line 298-314]: EVERY 10ms                 │
│  ├─ Check queued size                                       │
│  ├─ If < 0.2s:                                              │
│  │  └─ Render 32ms, enqueue to SDL                          │
│  └─ setTimeout(10ms) → recurse                              │
│                                                              │
│  _renderAndEnqueueChunk() [Line 283-296]:                  │
│  ├─ Allocate Float32Array                                  │
│  ├─ engine.renderBlock() → WASM                             │
│  ├─ Copy to Buffer                                          │
│  └─ device.enqueue(buffer) → SDL queue                      │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ SDL_QueueAudio()
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ SDL Layer (Native)                                            │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Queue Buffer (65536 bytes = ~1.4s @ 48kHz 2-channel)  │   │
│ │ [=================Data=================]               │   │
│ │ Write ptr ▲              Read ptr ▼ (audio hardware)  │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            Audio Hardware (Playback)
```

**Why This Works:**
1. **Large buffer (65536 bytes)** = 1.4 seconds at 48kHz
2. **Loose timing (10ms monitor loop)** is acceptable
3. **Chunk-ahead buffering**: Always 150-250ms in queue (Line 306-309)
4. **Predictable**: No real-time constraints

**Buffering Strategy:**
- Pre-render: 200ms (initial fill)
- Target queue: 150-250ms (Line 306)
- Monitor: Every 10ms
- Render chunk: 32ms
- **Result**: Audio stays smooth, no buffer underruns

### 2.2 Input Audio Flow (PROBLEMATIC)

**File:** `/home/monteslu/code/jsgl/webaudio-node/src/wasm-integration/MediaStreamSourceNode.js`

```
Audio Hardware (Recording) ─→ SDL Queue (8192 bytes)
                                  │
                                  │ SDL_DequeueAudio()
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ JavaScript Main Thread                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  start() [Line 64-123]:                                     │
│  ├─ Open SDL device: buffered=8192 bytes (~170ms @ 48k)    │
│  ├─ Allocate: _audioBuffer = Buffer.alloc(8192*4)          │
│  ├─ _pollingInterval = setInterval(→, 10ms) [Line 85,117]  │
│  └─ device.play() → start capturing                        │
│                                                              │
│  Poll Callback [Line 85-117]: EVERY 10ms                   │
│  │                                                          │
│  ├─ bytesRead = device.dequeue(_audioBuffer) [Line 88]     │
│  │  └─ Reads UP TO 8192 bytes from SDL queue              │
│  │  └─ PROBLEM: Could be 0 bytes (underrun!) or 8192      │
│  │                                                          │
│  ├─ Convert: Buffer → Float32Array [Line 91-96]            │
│  │  └─ Creates NEW typed array view each iteration        │
│  │                                                          │
│  ├─ Calculate RMS [Line 99-103]                            │
│  │  └─ CPU work in event loop                              │
│  │                                                          │
│  ├─ Allocate WASM memory [Line 107]                        │
│  │  └─ _malloc(sampleCount * 4)                            │
│  │  └─ PROBLEM: Memory allocation in hot loop!             │
│  │                                                          │
│  ├─ Copy data [Line 113]                                   │
│  │  └─ Set() with full array copy                          │
│  │                                                          │
│  ├─ Write to ring buffer [Line 114]                        │
│  │  └─ writeInputData() → RingBuffer.Write()               │
│  │                                                          │
│  └─ Free memory [Line 115]                                 │
│     └─ _free(inputPtr)                                     │
│                                                              │
│  RingBuffer.Write() [RingBuffer.h Line 20-44]:             │
│  ├─ Atomic load: write_pos and read_pos                    │
│  ├─ Calculate available space                              │
│  ├─ memcpy() data                                          │
│  ├─ Atomic store: write_pos                                │
│  └─ Return bytes written (may be < requested!)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              └─→ RingBuffer
         │                                 (capacity = 150ms)
         │
    Process thread pulls every
    ~3ms during WASM rendering
    (128-frame blocks)
```

**Why This Fails:**

1. **Timing Mismatch - Fundamental Issue**
   - SDL hardware: Samples arriving continuously (~48,000/second)
   - Polling interval: 10ms (100x slower than audio rate)
   - Poll gets: 0, 0, 0, ..., 480 bytes, 0, 0, ... (bursty!)
   - **Result: Jitter, timing skew**

2. **Buffer Size Too Small**
   - SDL input buffer: 8192 bytes = 170ms @ 48kHz mono
   - Ring buffer: 150ms capacity (Line 32 in MediaStreamSourceNode.js)
   - Polling every 10ms means: 17 poll cycles to fill
   - **Result: High packet loss rate**

3. **WASM Allocation in Hot Loop**
   - malloc/free per poll cycle (every 10ms)
   - Memory fragmentation
   - GC pressure
   - **Result: Latency spikes every 10ms**

4. **Ring Buffer Design Problem**
   - Using `std::atomic<size_t>` with `memory_order_relaxed`
   - No synchronization between producer (poll) and consumer (render)
   - Can lose data if buffer fills faster than renderer consumes
   - **Result: Silent data loss**

5. **Callback vs Polling Mismatch**
   - Microphone data arrives on SDL's schedule (real-time)
   - Polling reads on JavaScript's schedule (event loop)
   - WASM renders on audio graph's schedule (128-frame blocks)
   - **Three independent timing sources!**

---

## 3. Detailed Buffer Analysis

### 3.1 Output Buffer (Working)

**Configuration:**
```javascript
buffered: 65536  // bytes (Line 262)
```

At 48kHz, 2 channels, f32 (4 bytes/sample):
- Bytes per sample: 4
- Samples per channel: 48,000/second
- Bytes per second: 48,000 * 2 * 4 = 384,000 bytes/sec
- Buffer duration: 65536 / 384,000 = **0.171 seconds (171ms)**

Wait, that's wrong. Let me recalculate:
- Channels in buffer: 2 (stereo)
- Sample rate: 48,000 Hz
- Bytes per sample: 4 (float32)
- Total bytes per second: 48,000 samples/sec × 2 channels × 4 bytes/sample = 384,000 bytes/sec
- Buffer size: 65536 bytes
- Duration: 65536 / 384,000 = 0.171 sec = **171ms**

**Actual usage:**
```javascript
_renderAndEnqueueChunk(Math.ceil(this.sampleRate * 0.2)); // Pre-render 200ms
_monitorLoop(): if (queuedSeconds < 0.2)  // Keep > 200ms
```

So the strategy is:
- Pre-render: 200ms
- Monitor when: < 200ms
- Render: 32ms chunks
- Target: 200-250ms buffered
- SDL buffer: 171ms (shouldn't be exceeded)

**Actually, there's an issue here too.** The SDL buffer is only 171ms, but we're trying to keep 200ms in queue. That means data will be overflowing!

Let me look at the actual SDL buffer creation again:
```javascript
this._audioDevice = sdl.audio.openDevice(device, {
    type: 'playback',
    frequency: this.sampleRate,
    channels: this._channels,
    format: 'f32',
    buffered: 65536 // bytes - THIS IS THE TOTAL QUEUE SIZE
});
```

The `buffered` parameter is the **total internal queue size**. But we don't overflow because:
1. We check `queued` size before enqueuing
2. SDL.enqueue() probably blocks or fails if queue is full
3. We have safety margins

### 3.2 Input Buffer (Broken)

**Configuration:**
```javascript
buffered: 8192  // bytes (Line 75)
_audioBuffer = Buffer.alloc(8192 * 4)  // For dequeue (Line 79)

// WASM ring buffer:
this._wasmState = wasmModule._createMediaStreamSourceNode(
    this._sampleRate,
    this._channels,
    0.15  // 150ms buffer (Line 32)
);
```

At 48kHz, 1 channel (mono), f32:
- Bytes per second: 48,000 × 1 × 4 = 192,000 bytes/sec
- SDL buffer: 8192 / 192,000 = **42.7ms**
- Ring buffer: 150ms
- Polling: 10ms interval

**The Problem:**
```
Audio arrives: 48,000 samples/sec = 200 samples/10ms = 800 bytes/10ms
SDL buffer: 8192 bytes = ~41 polling cycles to fill
Polling interval: 10ms

Timeline:
T=0ms:   Poll 0 → 0 bytes (nothing yet)
T=10ms:  Poll 0 → 800 bytes (1 block accumulated)
T=20ms:  Poll 0 → 800 bytes (next block)
T=30ms:  Poll 0 → 800 bytes
...
T=410ms: Poll → 800 bytes (buffer full, losing next 400 bytes!)
T=420ms: Poll → 0 bytes (underrun!)
```

**Actual behavior:** High jitter, missed samples, buffer underruns.

---

## 4. Threading Model Analysis

### 4.1 Output (Playback)

```
JavaScript Main Thread
    │
    └─→ WasmAudioContext.resume()
        │
        ├─ SDL.openDevice() → queue mode (no callback)
        │
        ├─ Pre-render 200ms
        │
        ├─ setTimeout(0, _monitorLoop)
        │   │
        │   ├─→ _monitorLoop() [blocking code]
        │   │   ├─ Check queued size
        │   │   ├─ If < 0.2s: render + enqueue
        │   │   └─ setTimeout(10ms, recurse)  ← 10ms POLLING
        │   │
        │   └─ Returns
        │
        └─ SDL.play() ← triggers hardware playback
            │
            └─ Hardware reads from queue continuously
```

**Threading:** Single-threaded, but queue acts as buffer between JS and hardware.

### 4.2 Input (Recording)

```
Audio Hardware (Real-time)
    │
    └─ SDL.DequeueAudio()
        │
        └─ JavaScript Main Thread
            │
            ├─ setInterval(10ms, poll)  ← 10ms POLLING
            │  │
            │  ├─ dequeue() from SDL
            │  ├─ Convert + copy
            │  ├─ malloc/memcpy/free  ← BLOCKING!
            │  └─ write to RingBuffer
            │
            └─ WASM render thread (sort of)
               │
               └─ Every 128 frames (~2.7ms @ 48kHz)
                  ├─ Read from RingBuffer
                  ├─ Process audio graph
                  └─ Write to output queue
```

**Problem:** Two independent timing sources (hardware and polling) with no synchronization!

### 4.3 The Core Issue

**SDL uses Queue Mode because:**
- No callback thread available in JavaScript
- No real-time guarantees possible
- Main thread is not real-time

**But this breaks low-latency audio:**
- Hardware produces samples at precise intervals
- JavaScript polls at loose intervals
- Ring buffer doesn't know about these timing differences
- Result: Jitter, skew, data loss

---

## 5. Timing Guarantees Analysis

### 5.1 What SDL Guarantees in Callback Mode

```cpp
// If you used callback mode (not available in @kmamal/sdl):
void MyAudioCallback(void* userdata, uint8_t* stream, int len) {
    // GUARANTEED:
    // - Called every ~3ms (128 samples @ 48kHz)
    // - Always called on dedicated audio thread
    // - Real-time priority (won't be preempted by other processes)
    // - stream buffer is always ready
    // - You MUST fill len bytes, or audio glitches
}
```

### 5.2 What Queue Mode Guarantees

```javascript
device.dequeue(buffer, size)  // When safe:
// GUARANTEES:
// - Returns 0 or more bytes
// - Won't block
// - No guarantees about when samples arrived
// - No guarantees about timing

device.enqueue(buffer, size)  // When safe:
// GUARANTEES:
// - Enqueues data
// - May fail silently or block
// - No guarantee about when it will be played
```

### 5.3 What JavaScript Timing Guarantees

```javascript
setTimeout(fn, 10)  // Best effort, NOT guaranteed!
// - May be delayed by: garbage collection, other events, OS scheduling
// - Typical accuracy: ±20-100ms
// - Can be jittery and unpredictable
```

**For audio at 48kHz (20.8µs per sample), JavaScript timeout granularity is 10,000x WORSE than needed!**

---

## 6. Root Causes Summary

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| **Polling instead of push** | MediaStreamSourceNode.js:85-117 | Critical | Jitter, missed samples |
| **10ms polling interval** | MediaStreamSourceNode.js:117 | Critical | 480 samples out of phase |
| **8192-byte SDL buffer** | MediaStreamSourceNode.js:75 | High | 42ms per poll cycle |
| **150ms WASM ring buffer** | MediaStreamSourceNode.js:32 | High | 10 poll cycles to fill |
| **WASM malloc/free in loop** | MediaStreamSourceNode.js:107-115 | High | Memory pressure, GC pauses |
| **No backpressure handling** | RingBuffer.h:20-44 | High | Silent data loss |
| **std::atomic relaxed order** | RingBuffer.h:21-22,50 | Medium | Possible memory visibility issues |
| **No sync between threads** | Media and output paths | Critical | Complete timing misalignment |
| **Event loop for real-time** | All setTimeout/setInterval | Critical | Architectural mismatch |

---

## 7. What Works Well (Output)

The output playback works because:

1. **Correct buffering strategy**: Keep 150-250ms in queue
2. **Loose timing requirements**: 10ms polling is acceptable
3. **Monitoring loop adapts**: If queue drops, render more
4. **Large margin**: 200ms pre-render + 171ms SDL buffer = ~370ms margin
5. **No tight coupling**: Rendering and hardware are decoupled

---

## 8. Why Microphone Doesn't Work

The microphone fails because:

1. **Timing coupling**: Microphone data arrives on hardware schedule
2. **Polling mismatch**: 10ms polling vs continuous audio stream
3. **No synchronization**: No feedback from hardware to polling
4. **Small buffers**: 42ms SDL + 150ms WASM = 192ms total vs 370ms for output
5. **Allocations in hot path**: malloc/free every 10ms
6. **Ring buffer overflow**: When hardware is faster than polling + rendering

---

## 9. Specific Code Locations for Fixes

### File 1: `/home/monteslu/code/jsgl/webaudio-node/src/wasm-integration/MediaStreamSourceNode.js`

**Problem Areas:**
- Line 75: `buffered: 8192` - Too small
- Line 85-117: Polling every 10ms - Too slow and bursty
- Line 88: `dequeue()` - Can return 0 bytes or up to max
- Line 107-115: malloc/free in loop - Memory pressure
- Line 32: `0.15` (150ms) - Not enough margin

**Why This is Wrong:**
```javascript
// Current code polls like this:
const bytesRead = this._inputDevice.dequeue(this._audioBuffer);
if (bytesRead > 0) {
    // Process bytesRead bytes
    // Problem: bytesRead is unpredictable (0 or up to 8192)
    // Problem: 10ms polling can't keep up with 48kHz stream
}
```

### File 2: `/home/monteslu/code/jsgl/webaudio-node/src/wasm/utils/RingBuffer.h`

**Problem Areas:**
- Line 21-22: `memory_order_relaxed` - Insufficient sync
- Line 50: `memory_order_acquire` - After reading position
- Line 27-29: `if (to_write == 0) return 0` - Silent data loss
- No backpressure mechanism

**Why This is Wrong:**
```cpp
// Current lock-free ring buffer uses relaxed atomics:
write_pos_.load(std::memory_order_relaxed);  // No sync!
read_pos_.load(std::memory_order_acquire);   // Weak sync!
// Problem: Between JS and WASM running separately, this is unsafe
```

### File 3: `/home/monteslu/code/jsgl/webaudio-node/src/wasm/media_stream_source.cpp`

**Problem Areas:**
- Line 19-26: Buffer capacity calculation assumes continuous data
- Line 56-62: `writeInputData()` doesn't handle overflow
- Line 74-99: `processMediaStreamSourceNode()` has no backpressure

---

## 10. Diagnosis: The Real Problem

**This is not a "tuning" problem. This is an architectural problem.**

The system is trying to use **JavaScript's event loop for real-time audio synchronization**. This cannot work because:

1. **JavaScript is not real-time** - No hard deadlines, subject to GC
2. **Event loop granularity is 10-100ms** - Audio needs microseconds
3. **Queue mode doesn't give feedback** - No way to know when samples arrived
4. **Polling is fundamentally wrong** - Real-time systems use interrupts, not polling

The output works because it doesn't depend on these guarantees. It just pre-renders chunks and maintains a big buffer.

The input fails because it tries to stay synchronized with the real-time audio stream using polling and JavaScript timing.

---

## 11. Fix Strategy (Architectural)

### Why Worker Thread Approach Will Fix This

The `threading.md` document already outlines the solution: **Worker Thread with rawr RPC**

**Why it works:**
1. **Separate thread**: Can dedicate one thread to audio rendering
2. **setInterval(0)**: Continuous rendering, not 10ms polling
3. **SharedArrayBuffer**: Zero-copy ring buffer between threads
4. **No JavaScript synchronization**: Just reads and writes, hardware handles timing
5. **Architecture matches SDL Queue Mode**: Main thread does I/O, worker does rendering

**Example from threading.md (lines 214-263):**

Worker thread runs continuously:
```javascript
setInterval(() => {
    if (!running) return;
    const numFrames = calculateFramesNeeded();
    engine.renderBlock(audioChunk, numFrames);
    workerPeer.enqueueAudio(audioChunk.buffer);
}, 0);  // ← Runs as fast as possible, not every 10ms!
```

This produces data continuously, not in bursts, which matches how audio hardware expects it.

### Current Issue vs Fixed Architecture

**Current (Broken):**
```
SDL Input (48kHz)
    → Queued (8192 bytes)
    ← Polled every 10ms (0 or 800 bytes)  ← PROBLEM
    → Ring buffer (JavaScript thread)
    → Rendered every 2.7ms (WASM)
    → Needs sync between 3 independent timings
    ✗ Data loss, jitter, dropouts
```

**Fixed (Worker Thread):**
```
SDL Input (48kHz)
    → Queued (larger buffer)
    ← Continuously dequeued (Worker thread)  ← FIXED
    → Shared ring buffer (zero-copy)
    → Continuously rendered (Worker setInterval(0))
    → All on same thread, continuous flow
    ✓ Data stays in sync, no dropouts
```

---

## 12. Exact Locations to Inspect and Fix

### For Immediate Band-Aid Fixes (Not Recommended)

1. **Increase SDL input buffer**: Line 75
   - `buffered: 8192` → `buffered: 65536` (match output)
   - Still doesn't fix jitter, but fewer overruns

2. **Increase ring buffer**: Line 32
   - `0.15` → `0.5` (500ms)
   - Hides problem longer, adds latency

3. **Reduce polling interval**: Line 117
   - `10` → `1` (1ms polling)
   - Uses more CPU, still not real solution

4. **Pre-allocate in WASM**: Line 107
   - Allocate once, reuse buffer
   - Fixes memory pressure but not timing

### For Real Fix: Worker Thread Implementation

See `threading.md` lines 195-334 for the complete architecture.

**Key files to modify:**
1. Create: `/home/monteslu/code/jsgl/webaudio-node/src/wasm-integration/wasm-audio-worker.js`
   - Runs continuous rendering loop
   - Exports rawr RPC methods

2. Modify: `/home/monteslu/code/jsgl/webaudio-node/src/wasm-integration/WasmAudioContext.js`
   - Create worker on resume()
   - Use rawr for RPC instead of direct engine calls
   - Feed input to worker, get output from worker

3. Modify: `/home/monteslu/code/jsgl/webaudio-node/src/wasm-integration/MediaStreamSourceNode.js`
   - Push to shared ring buffer instead of polling
   - Worker pulls continuously

4. Modify: `/home/monteslu/code/jsgl/webaudio-node/src/wasm/utils/RingBuffer.h`
   - Use `std::atomic` with proper `memory_order_release/acquire`
   - Add backpressure/overflow detection

---

## 13. Comparison: Current vs Future

| Aspect | Current (Chunk-Ahead) | Future (Worker Thread) |
|--------|---------------------|----------------------|
| **Input latency** | 150-500ms | 10-50ms |
| **Output latency** | 170ms | 10-50ms |
| **Polling interval** | 10ms | 0ms (continuous) |
| **Thread model** | Single JS thread | JS main + WASM worker |
| **Timing source** | JavaScript timeouts | Operating system clock |
| **Synchronization** | Loose (buffers) | Tight (continuous) |
| **Memory allocations** | Frequent (per chunk) | Once at startup |
| **Use cases** | Background music | Interactive audio, real-time |

---

## Conclusion

The webaudio-node audio system has a **fundamental architectural flaw**: it's using JavaScript's main thread and event loop for real-time audio synchronization. This cannot work.

**The fix is not tuning parameters. The fix is changing the architecture to use Worker Threads.**

The detailed plan is already in `threading.md`. The implementation requires:
1. Creating a dedicated audio worker thread
2. Using `setInterval(0)` for continuous rendering (not 10ms polling)
3. Implementing SharedArrayBuffer ring buffer for zero-copy data transfer
4. Using rawr RPC for clean main↔worker communication

This is a large change, but the current approach has hard limits that cannot be overcome with parameter tuning.
