# Known Issues

## BiquadFilterNode and DynamicsCompressorNode produce silence in OfflineAudioContext

**Status**: Open bug
**Severity**: High
**Affects**: Offline rendering only

### Description

When using `AudioBufferSourceNode` as input to `BiquadFilterNode` or `DynamicsCompressorNode` in an `OfflineAudioContext`, the output is completely silent (all zeros).

### Working Configurations

✅ **These work correctly:**
- BufferSource → destination
- BufferSource → GainNode → destination
- OscillatorNode → BiquadFilterNode → destination
- OscillatorNode → DynamicsCompressorNode → destination
- All nodes work correctly in regular `AudioContext` (non-offline)

❌ **These produce silence:**
- BufferSource → BiquadFilterNode → destination (offline only)
- BufferSource → DynamicsCompressorNode → destination (offline only)

### Reproduction

```javascript
import { AudioContext, OfflineAudioContext } from 'webaudio-node';

// Decode an MP3
const ctx = new AudioContext({ sampleRate: 48000 });
await ctx.resume();
const decoded = await ctx.decodeAudioData(mp3Data);
await ctx.close();

// Try to process in offline context
const offline = new OfflineAudioContext({
  numberOfChannels: 2,
  length: 48000,
  sampleRate: 48000
});

// Copy buffer to offline context
const buffer = offline.createBuffer(2, 48000, 48000);
for (let ch = 0; ch < 2; ch++) {
  buffer.copyToChannel(decoded.getChannelData(ch), ch);
}

const source = offline.createBufferSource();
source.buffer = buffer;

const filter = offline.createBiquadFilter();
filter.type = 'lowpass';
filter.frequency.value = 2000;

source.connect(filter);
filter.connect(offline.destination);
source.start(0);

const rendered = await offline.startRendering();
// rendered.getChannelData(0) is all zeros! ❌
```

### Workaround

For offline processing of decoded audio, avoid using BiquadFilterNode and DynamicsCompressorNode. Use GainNode and other nodes that currently work.

### Investigation Needed

This appears to be a bug in the C++ OfflineAudioEngine implementation. The filters work fine with oscillator sources but not with buffer sources. Possible causes:

1. Buffer timing/scheduling issue in offline rendering
2. Filter state initialization problem when input is from a buffer
3. Sample data not being properly passed from buffer source to filter nodes

### Related Files

- `src/native/offline_audio_engine.cpp` - Offline rendering implementation
- `src/native/nodes/buffer_source_node.cpp` - Buffer source node
- `src/native/nodes/biquad_filter_node.cpp` - Biquad filter
- `src/native/nodes/dynamics_compressor_node.cpp` - Dynamics compressor
