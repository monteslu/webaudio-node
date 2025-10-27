import { OfflineAudioContext } from './src/javascript/index.js';

console.log('\n🧪 Testing offline rendering with buffer source...\n');

const offlineCtx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: 48000,
    sampleRate: 48000
});

// Create a simple buffer with a sine wave
console.log('1. Creating audio buffer manually...');
const buffer = offlineCtx.createBuffer(2, 48000, 48000);
const channelData = buffer.getChannelData(0);
for (let i = 0; i < channelData.length; i++) {
    channelData[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5;
}
// Copy to second channel
buffer.copyToChannel(channelData, 1);

console.log('   First 5 samples:', channelData.slice(0, 5));

// Play it back through offline context
console.log('\n2. Creating buffer source...');
const source = offlineCtx.createBufferSource();
source.buffer = buffer;

const gain = offlineCtx.createGain();
gain.gain.value = 1.0;

source.connect(gain);
gain.connect(offlineCtx.destination);

source.start(0);

console.log('3. Rendering...');
const rendered = await offlineCtx.startRendering();

console.log('   ✅ Complete!');

// Check output
const outData = rendered.getChannelData(0);
console.log('\nFirst 10 output samples:', outData.slice(0, 10));

let max = 0;
for (let i = 0; i < outData.length; i++) {
    max = Math.max(max, Math.abs(outData[i]));
}

console.log('Max amplitude:', max);
console.log('\n' + (max > 0.0001 ? '✅ HAS AUDIO' : '❌ SILENT!'));
