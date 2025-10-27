import { AudioContext, OfflineAudioContext } from './src/javascript/index.js';

console.log('\n🧪 Testing buffer usage across contexts...\n');

// Create buffer in one context
console.log('1. Creating buffer in AudioContext...');
const ctx1 = new AudioContext({ sampleRate: 48000 });
const buffer = ctx1.createBuffer(2, 48000, 48000);

// Fill with sine wave
const ch0 = buffer.getChannelData(0);
for (let i = 0; i < ch0.length; i++) {
    ch0[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5;
}
buffer.copyToChannel(ch0, 1);

console.log('   Buffer created, max amplitude:', 0.5);
console.log('   Interleaved buffer length:', buffer._getInterleavedData().length);

await ctx1.close();

// Use in different offline context
console.log('\n2. Using buffer in OfflineAudioContext...');
const ctx2 = new OfflineAudioContext({
    numberOfChannels: 2,
    length: 48000,
    sampleRate: 48000
});

const source = ctx2.createBufferSource();
source.buffer = buffer;
source.connect(ctx2.destination);
source.start(0);

console.log('3. Rendering...');
const rendered = await ctx2.startRendering();

const outData = rendered.getChannelData(0);
let max = 0;
for (let i = 0; i < outData.length; i++) {
    max = Math.max(max, Math.abs(outData[i]));
}

console.log('   Max amplitude in output:', max);
console.log('\n' + (max > 0.0001 ? '✅ CROSS-CONTEXT WORKS' : '❌ CROSS-CONTEXT FAILS'));
