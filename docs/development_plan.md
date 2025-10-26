# WebAudio-Node High Performance Architecture - Development Plan

## Proposed Project Structure

```
webaudio-node/
├── binding.gyp                 # Native build configuration
├── package.json
├── README.md
│
├── src/
│   ├── native/                 # C++ native audio engine
│   │   ├── module.cpp         # N-API module entry point
│   │   ├── audio_engine.h     # Core audio engine header
│   │   ├── audio_engine.cpp   # SDL audio callback & mixing
│   │   ├── audio_graph.h      # Audio node graph processing
│   │   ├── audio_graph.cpp
│   │   ├── nodes/             # Native node implementations
│   │   │   ├── source_node.cpp
│   │   │   ├── gain_node.cpp
│   │   │   ├── oscillator_node.cpp
│   │   │   ├── biquad_filter_node.cpp
│   │   │   └── ...
│   │   └── utils/
│   │       ├── resampler.cpp  # Sample rate conversion
│   │       └── mixer.cpp      # Multi-channel mixing
│   │
│   └── javascript/            # JS API layer (Web Audio API)
│       ├── AudioContext.js
│       ├── AudioNode.js
│       ├── AudioParam.js
│       ├── nodes/
│       │   ├── AudioBufferSourceNode.js
│       │   ├── GainNode.js
│       │   ├── OscillatorNode.js
│       │   ├── BiquadFilterNode.js
│       │   └── ...
│       └── index.js
│
├── scripts/
│   ├── install.mjs            # Download prebuilt binaries
│   ├── download-sdl.mjs       # Download SDL from build-sdl
│   └── build.mjs              # Local build script
│
├── .github/
│   └── workflows/
│       └── build.yml          # CI/CD for prebuilt binaries
│
└── test/
    ├── basic-playback.js
    ├── mixing.js
    └── performance.js
```

## Development Plan

### Phase 1: Project Setup & Infrastructure (Week 1)
**Goal**: Set up build system and CI/CD

1. **Create native addon scaffold**
   - Set up binding.gyp (based on node-sdl's structure)
   - Configure N-API with node-addon-api
   - Set up SDL2 linking for all platforms
   - Create basic module.cpp entry point

2. **Set up build scripts**
   - Create install.mjs to download prebuilt binaries
   - Create download-sdl.mjs to get SDL from build-sdl releases
   - Create build.mjs for local development builds

3. **GitHub Actions CI/CD**
   - Matrix build for: macOS (x64, arm64), Linux (x64, arm64), Windows (x64)
   - Upload prebuilt binaries to GitHub releases on tag push
   - Test workflow with dummy native module

4. **Update package.json**
   - Add gypfile: true
   - Configure install script
   - Update dependencies (remove @kmamal/sdl, keep fluent-ffmpeg)

### Phase 2: Core Audio Engine (Week 2-3)
**Goal**: Single SDL audio device with callback-based mixing

1. **Implement audio_engine.cpp**
   - Single SDL_AudioDevice initialization
   - SDL audio callback function (runs on audio thread)
   - Lock-free ringbuffer for JS → audio thread communication
   - Sample-accurate timing based on SDL callback

2. **Implement audio_graph.cpp**
   - Graph data structure (nodes, connections)
   - Graph traversal & topological sort
   - Pull-based rendering model (destination pulls from sources)
   - Thread-safe graph updates

3. **Basic mixer**
   - Multi-input mixing (sum signals)
   - Clipping/limiting
   - Channel up/down-mixing

4. **N-API bindings**
   - Expose audio engine to JS
   - Initialize/destroy context
   - Add/remove nodes from graph
   - Connect/disconnect nodes

### Phase 3: Core Audio Nodes (Week 4-5)
**Goal**: Implement essential nodes in C++ for performance

1. **AudioDestinationNode** (native)
   - Graph sink that writes to SDL buffer
   - Sample-accurate scheduling

2. **AudioBufferSourceNode** (native)
   - Playback from decoded buffer
   - Playback rate control
   - Loop support
   - Sample-accurate start/stop

3. **GainNode** (native)
   - Simple amplitude multiplication
   - AudioParam support for gain automation

4. **OscillatorNode** (native)
   - Sine, square, sawtooth, triangle waveforms
   - Frequency & detune AudioParam
   - Phase-continuous generation

5. **AudioParam** (native)
   - a-rate (audio-rate) and k-rate (control-rate) processing
   - Linear/exponential ramping
   - setValueAtTime, linearRampToValueAtTime, etc.

### Phase 4: JavaScript API Layer (Week 6)
**Goal**: Web Audio API compliant JavaScript interface

1. **Refactor existing JS classes**
   - AudioContext.js: Remove device pool hack, call native engine
   - AudioNode.js: Update connect/disconnect to use native graph
   - Maintain existing API surface

2. **Implement proper state management**
   - suspended/running/closed states
   - currentTime from native engine
   - resume/suspend/close

3. **Keep FFmpeg integration**
   - decodeAudioData stays in JS
   - Pass decoded buffers to native

4. **AudioParam JavaScript wrapper**
   - Proxy calls to native AudioParam
   - Automation methods

### Phase 5: Advanced Nodes (Week 7-8)
**Goal**: Expand node coverage

1. **BiquadFilterNode**
   - Lowpass, highpass, bandpass, etc.
   - Frequency, Q, gain params

2. **PannerNode / StereoPannerNode**
   - Spatial audio
   - HRTF (optional)

3. **DelayNode**
   - Delay line implementation
   - delayTime param

4. **DynamicsCompressorNode**
   - Threshold, ratio, attack, release
   - Sidechain support

5. **AnalyserNode**
   - FFT for frequency/time domain data
   - getByteFrequencyData, etc.

### Phase 6: Testing & Optimization (Week 9)
**Goal**: Ensure correctness and performance

1. **Unit tests**
   - Test each node type
   - Test graph construction/traversal
   - Test mixing accuracy

2. **Performance benchmarks**
   - Compare against current implementation
   - Stress test with many nodes
   - Measure latency

3. **Memory profiling**
   - Check for leaks in native code
   - Optimize buffer allocation

### Phase 7: Documentation & Polish (Week 10)
**Goal**: Ship production-ready package

1. **Update README**
   - New architecture explanation
   - Performance characteristics
   - Breaking changes (if any)

2. **API documentation**
   - Document Web Audio API compliance
   - Note any deviations from spec

3. **Examples**
   - Update existing examples
   - Add mixing example
   - Add effects chain example

4. **Version & publish**
   - Bump to 1.0.0
   - Publish to npm with prebuilt binaries

## Key Technical Decisions

### Audio Thread Architecture
- **SDL callback runs on audio thread** (high priority, real-time)
- **Graph updates from JS thread** use lock-free structures or quick locks
- **Pull model**: Destination pulls from graph during callback

### Memory Management
- **AudioBuffers**: Shared between JS and C++ (maybe using ArrayBuffer)
- **Zero-copy where possible**: FFmpeg → Buffer → Native without copying
- **Pre-allocated scratch buffers** for mixing (avoid allocation in callback)

### Sample-Accurate Timing
- Track sample frames, not wall-clock time
- AudioParam automation uses sample-frame offsets
- start() times converted to sample frames

### Platform-Specific Notes
- Reuse build-sdl binaries (SDL 2.32.8 or newer)
- Windows: MSVC build
- macOS: Universal binary support (x64 + arm64)
- Linux: Work with both glibc and musl (if possible)

---

This plan takes webaudio-node from a multi-device hack to a proper, performant Web Audio implementation with native mixing, all while maintaining the Web Audio API surface that users expect.

## Web Audio API 1.1 Spec Compliance Update

After reviewing the full Web Audio API 1.1 specification, the following critical gaps have been identified:

### Current Implementation Status: ~55% Spec Compliant

**What We Built (v1.0 baseline):**
- 7 out of 19+ required node types (37% coverage)
- 3 out of 7 AudioParam automation methods
- Basic audio graph with node connections
- Native C++ mixing engine

**Critical Fixes Required (Phase 1 - Before v1.0):**

1. **AudioParam Automation - BROKEN** (1-2 days)
   - Fix `setTargetAtTime()` - Currently TODO stub
   - Fix `setValueCurveAtTime()` - Currently TODO stub
   - Fix `cancelScheduledValues()` - Currently TODO stub
   - Fix `cancelAndHoldAtTime()` - Currently TODO stub
   - Location: `src/javascript/AudioParam.js` lines 57-76

2. **AudioParam Modulation - MISSING** (2-3 days)
   - Cannot connect AudioNode output to AudioParam (e.g., LFO modulation)
   - Modify `AudioNode.connect()` to detect AudioParam destinations
   - Implement parameter modulation in audio_graph
   - Critical for synthesis use cases

3. **PannerNode - INCOMPLETE** (2-3 days)
   - Currently only simple stereo pan, NOT full 3D spatialization
   - Either rename to StereoPannerNode or implement full spec
   - Missing: 3D position, distance models, HRTF, cone effects

4. **AudioBufferSourceNode - Incomplete** (1 day)
   - Add `loopStart`, `loopEnd`, `detune` parameters

### Missing Node Types (High Priority for v1.1)

5. **StereoPannerNode** - Simple stereo panning (1 day)
6. **ChannelMergerNode** - Combine channels (1 day)
7. **ChannelSplitterNode** - Split channels (1 day)
8. **AnalyserNode** - FFT analysis for visualization (4 days)
9. **DynamicsCompressorNode** - Audio compression (5 days)
10. **ConstantSourceNode** - Constant signal source (1 day)

### Missing Node Types (Medium Priority for v1.2)

11. **WaveShaperNode** - Distortion effects (2 days)
12. **IIRFilterNode** - General IIR filtering (3 days)
13. **ConvolverNode** - Reverb via convolution (5 days)

### Missing Features (Long Term v2.0)

14. **OfflineAudioContext** - Non-realtime rendering (2 weeks)
15. **PeriodicWave** - Custom oscillator waveforms (3 days)
16. **AudioWorkletNode** - Custom processing (3 weeks)

### Spec Compliance Roadmap

**Phase 1 (Critical Fixes):** 1-2 weeks
- Fix all broken AudioParam methods
- Add AudioParam modulation support
- Fix or rename PannerNode
- Complete AudioBufferSourceNode

**Phase 2 (High-Value Nodes):** 2-3 weeks
- StereoPannerNode
- Channel splitter/merger
- AnalyserNode
- DynamicsCompressorNode

**Phase 3 (Effects):** 2-3 weeks
- WaveShaperNode
- IIRFilterNode
- ConvolverNode

**Phase 4 (Advanced):** 1-2 months
- OfflineAudioContext
- AudioWorkletNode

### Updated Version Plan

- **v0.9 (Current)**: Baseline implementation with known gaps
- **v1.0**: Phase 1 critical fixes complete (~65% spec compliant)
- **v1.1**: Phase 2 high-value nodes (~75% spec compliant)
- **v1.2**: Phase 3 effects nodes (~85% spec compliant)
- **v2.0**: Phase 4 advanced features (~95% spec compliant)

See `SPEC_COMPLIANCE.md` for detailed analysis.
