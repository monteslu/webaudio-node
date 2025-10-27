// Comprehensive Web Audio API Test Suite
// Tests all nodes, parameters, and features

import { OfflineAudioContext } from '../index.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ ${message}`);
        failed++;
    }
}

function assertApprox(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        console.log(`  ✅ ${message} (${actual.toFixed(6)} ≈ ${expected.toFixed(6)})`);
        passed++;
    } else {
        console.error(`  ❌ ${message} (${actual.toFixed(6)} vs ${expected.toFixed(6)}, diff: ${diff.toFixed(6)})`);
        failed++;
    }
}

console.log('\n🎵 Web Audio API Test Suite\n');

// Test 1: AudioContext Creation
console.log('Test 1: AudioContext Creation');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: 1000, sampleRate: 44100 });
    assert(ctx !== null, 'AudioContext created');
    assert(ctx.sampleRate === 44100, 'Sample rate is 44100');
    assert(ctx.destination !== null, 'Destination node exists');
    assert(ctx.destination.numberOfInputs === 1, 'Destination has 1 input');
    assert(ctx.destination.numberOfOutputs === 0, 'Destination has 0 outputs');
}

// Test 2: OscillatorNode
console.log('\nTest 2: OscillatorNode');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 44100, sampleRate: 44100 });
    const osc = ctx.createOscillator();

    assert(osc !== null, 'Oscillator created');
    assert(osc.numberOfInputs === 0, 'Oscillator has 0 inputs');
    assert(osc.numberOfOutputs === 1, 'Oscillator has 1 output');
    assert(osc.type === 'sine', 'Default type is sine');
    assert(osc.frequency.value === 440, 'Default frequency is 440Hz');

    osc.frequency.value = 880;
    assert(osc.frequency.value === 880, 'Frequency can be changed');

    osc.type = 'square';
    assert(osc.type === 'square', 'Type can be changed to square');

    osc.type = 'sawtooth';
    assert(osc.type === 'sawtooth', 'Type can be changed to sawtooth');

    osc.type = 'triangle';
    assert(osc.type === 'triangle', 'Type can be changed to triangle');
}

// Test 3: GainNode
console.log('\nTest 3: GainNode');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const gain = ctx.createGain();

    assert(gain !== null, 'GainNode created');
    assert(gain.numberOfInputs === 1, 'GainNode has 1 input');
    assert(gain.numberOfOutputs === 1, 'GainNode has 1 output');
    assert(gain.gain.value === 1.0, 'Default gain is 1.0');

    gain.gain.value = 0.5;
    assert(gain.gain.value === 0.5, 'Gain can be changed');
}

// Test 4: AudioBufferSourceNode
console.log('\nTest 4: AudioBufferSourceNode');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const source = ctx.createBufferSource();

    assert(source !== null, 'AudioBufferSourceNode created');
    assert(source.numberOfInputs === 0, 'Source has 0 inputs');
    assert(source.numberOfOutputs === 1, 'Source has 1 output');
    assert(source.buffer === null, 'Default buffer is null');
    assert(source.loop === false, 'Default loop is false');
}

// Test 5: BiquadFilterNode
console.log('\nTest 5: BiquadFilterNode');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const filter = ctx.createBiquadFilter();

    assert(filter !== null, 'BiquadFilterNode created');
    assert(filter.numberOfInputs === 1, 'Filter has 1 input');
    assert(filter.numberOfOutputs === 1, 'Filter has 1 output');
    assert(filter.type === 'lowpass', 'Default type is lowpass');
    assert(filter.frequency.value === 350, 'Default frequency is 350Hz');
    assert(filter.Q.value === 1, 'Default Q is 1');

    filter.type = 'highpass';
    assert(filter.type === 'highpass', 'Type can be changed to highpass');
}

// Test 6: AudioBuffer
console.log('\nTest 6: AudioBuffer');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const buffer = ctx.createBuffer(2, 1000, 44100);

    assert(buffer !== null, 'AudioBuffer created');
    assert(buffer.numberOfChannels === 2, 'Buffer has 2 channels');
    assert(buffer.length === 1000, 'Buffer length is 1000');
    assert(buffer.sampleRate === 44100, 'Buffer sample rate is 44100');
    assertApprox(buffer.duration, 1000 / 44100, 0.0001, 'Buffer duration calculated correctly');

    const channelData = buffer.getChannelData(0);
    assert(channelData !== null, 'Can get channel data');
    assert(channelData.length === 1000, 'Channel data length is 1000');
}

// Test 7: Node Connections
console.log('\nTest 7: Node Connections');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const result = osc.connect(gain);
    assert(result === gain, 'connect() returns destination');

    const result2 = gain.connect(ctx.destination);
    assert(result2 === ctx.destination, 'Can connect to destination');
}

// Test 8: AudioParam Automation - setValueAtTime
console.log('\nTest 8: AudioParam.setValueAtTime');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const gain = ctx.createGain();

    const result = gain.gain.setValueAtTime(0.5, 0);
    assert(result === gain.gain, 'setValueAtTime returns AudioParam');
    assert(gain.gain.value === 0.5, 'Value is updated');
}

// Test 9: AudioParam Automation - linearRampToValueAtTime
console.log('\nTest 9: AudioParam.linearRampToValueAtTime');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const gain = ctx.createGain();

    gain.gain.setValueAtTime(0, 0);
    const result = gain.gain.linearRampToValueAtTime(1.0, 1.0);
    assert(result === gain.gain, 'linearRampToValueAtTime returns AudioParam');
}

// Test 10: AudioParam Automation - exponentialRampToValueAtTime
console.log('\nTest 10: AudioParam.exponentialRampToValueAtTime');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const osc = ctx.createOscillator();

    osc.frequency.setValueAtTime(440, 0);
    const result = osc.frequency.exponentialRampToValueAtTime(880, 1.0);
    assert(result === osc.frequency, 'exponentialRampToValueAtTime returns AudioParam');
}

// Test 11: Rendering - Silent Context
console.log('\nTest 11: Rendering - Silent Context');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const buffer = await ctx.startRendering();

    assert(buffer !== null, 'Rendering produces buffer');
    assert(buffer.numberOfChannels === 1, 'Output has 1 channel');
    assert(buffer.length === 1000, 'Output length is 1000');

    const data = buffer.getChannelData(0);
    let allZero = true;
    for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0) {
            allZero = false;
            break;
        }
    }
    assert(allZero, 'Silent context produces zeros');
}

// Test 12: Rendering - Oscillator
console.log('\nTest 12: Rendering - Oscillator (Sine Wave)');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 44100, sampleRate: 44100 });
    const osc = ctx.createOscillator();
    osc.frequency.value = 440;
    osc.type = 'sine';
    osc.connect(ctx.destination);
    osc.start(0);

    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
        min = Math.min(min, data[i]);
        max = Math.max(max, data[i]);
    }

    assertApprox(min, -1.0, 0.1, 'Sine wave minimum near -1');
    assertApprox(max, 1.0, 0.1, 'Sine wave maximum near 1');

    // Check it's not all the same value
    assert(max - min > 1.8, 'Sine wave has range');
}

// Test 13: Rendering - Gain Scaling
console.log('\nTest 13: Rendering - Gain Scaling');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 44100, sampleRate: 44100 });
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.5;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);

    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);

    let max = 0;
    for (let i = 0; i < data.length; i++) {
        max = Math.max(max, Math.abs(data[i]));
    }

    assertApprox(max, 0.5, 0.1, 'Gain scales amplitude to 0.5');
}

// Test 14: Rendering - Multiple Nodes
console.log('\nTest 14: Rendering - Multiple Oscillators (Mixing)');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 44100, sampleRate: 44100 });
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.frequency.value = 440;
    osc2.frequency.value = 880;
    gain1.gain.value = 0.25;
    gain2.gain.value = 0.25;

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc1.start(0);
    osc2.start(0);

    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);

    let max = 0;
    for (let i = 0; i < data.length; i++) {
        max = Math.max(max, Math.abs(data[i]));
    }

    assert(max > 0.4 && max < 0.6, 'Mixed oscillators sum correctly');
}

// Test 15: AudioBufferSourceNode with Buffer
console.log('\nTest 15: AudioBufferSourceNode with Buffer');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1000, sampleRate: 44100 });
    const buffer = ctx.createBuffer(1, 500, 44100);
    const channelData = buffer.getChannelData(0);

    // Fill with 0.5
    for (let i = 0; i < channelData.length; i++) {
        channelData[i] = 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    const rendered = await ctx.startRendering();
    const data = rendered.getChannelData(0);

    // Verify buffer playback
    assertApprox(data[0], 0.5, 0.01, 'First sample is 0.5');
    assertApprox(data[250], 0.5, 0.01, 'Middle sample is 0.5');
    assertApprox(data[499], 0.5, 0.01, 'Last buffer sample is 0.5');
    // Note: Exact behavior after buffer end varies by implementation
}

// Test 16: BiquadFilterNode (Lowpass)
console.log('\nTest 16: BiquadFilterNode (Lowpass)');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 44100, sampleRate: 44100 });
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();

    osc.frequency.value = 10000; // High frequency
    filter.type = 'lowpass';
    filter.frequency.value = 1000; // Cut at 1kHz

    osc.connect(filter);
    filter.connect(ctx.destination);
    osc.start(0);

    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);

    let max = 0;
    for (let i = 0; i < data.length; i++) {
        max = Math.max(max, Math.abs(data[i]));
    }

    assert(max < 0.5, 'Lowpass filter attenuates high frequency');
}

// Test 17: Stereo Rendering
console.log('\nTest 17: Stereo Rendering');
{
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: 1000, sampleRate: 44100 });
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.start(0);

    const buffer = await ctx.startRendering();

    assert(buffer.numberOfChannels === 2, 'Output has 2 channels');

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    assert(left.length === 1000, 'Left channel has correct length');
    assert(right.length === 1000, 'Right channel has correct length');

    // Both channels should be identical for mono-to-stereo
    assert(left[100] === right[100], 'Stereo channels are identical');
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failed === 0) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
} else {
    console.error(`❌ ${failed} test(s) failed\n`);
    process.exit(1);
}
