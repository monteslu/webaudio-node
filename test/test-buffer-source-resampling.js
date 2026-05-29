import assert from 'assert';
import { WasmOfflineAudioContext as OfflineAudioContext } from '../src/wasm-integration/WasmOfflineAudioContext.js';

const inputSampleRate = 1000;
const outputSampleRate = 2000;
const inputLength = 1000;
const outputLength = Math.ceil((inputLength * outputSampleRate) / inputSampleRate);

const ctx = new OfflineAudioContext({
    numberOfChannels: 1,
    length: outputLength,
    sampleRate: outputSampleRate
});

const buffer = ctx.createBuffer(1, inputLength, inputSampleRate);
buffer.getChannelData(0).fill(1);

const source = ctx.createBufferSource();
source.buffer = buffer;
source.connect(ctx.destination);
source.start(0);

const rendered = await ctx.startRendering();
const output = rendered.getChannelData(0);

assert.strictEqual(output.length, outputLength);
assert.strictEqual(rendered.sampleRate, outputSampleRate);

const earlyAverage =
    output.subarray(100, 500).reduce((sum, value) => sum + value, 0) / 400;
const lateAverage =
    output.subarray(1400, 1800).reduce((sum, value) => sum + value, 0) / 400;

assert(
    earlyAverage > 0.9,
    `expected early resampled audio to remain near full scale, got ${earlyAverage}`
);
assert(
    lateAverage > 0.9,
    `expected buffer playback to last after resampling, got late average ${lateAverage}`
);

console.log('BufferSource resampling test passed');
