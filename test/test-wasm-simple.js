import { OfflineAudioContext } from '../index-wasm.js';

console.log('\n🧪 Testing WASM offline rendering...\n');

const ctx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: 48000, // 1 second at 48kHz
    sampleRate: 48000
});

// Create simple oscillator
const osc = ctx.createOscillator();
osc.type = 'sine';
osc.frequency.value = 440;

const gain = ctx.createGain();
gain.gain.value = 0.5;

osc.connect(gain);
gain.connect(ctx.destination);

osc.start(0);

console.log('Rendering...');
const start = performance.now();
const buffer = await ctx.startRendering();
const elapsed = performance.now() - start;

console.log('\n✅ Render complete in', elapsed.toFixed(2), 'ms');
console.log('Channels:', buffer.numberOfChannels);
console.log('Length:', buffer.length);
console.log('Duration:', buffer.duration, 'seconds');

// Check channel data
const ch0 = buffer.getChannelData(0);
console.log('\nFirst 10 samples:', ch0.slice(0, 10));

// Check for non-zero samples
let max = 0;
let nonZeroCount = 0;
for (let i = 0; i < ch0.length; i++) {
    if (Math.abs(ch0[i]) > 0.0001) {
        nonZeroCount++;
    }
    max = Math.max(max, Math.abs(ch0[i]));
}

console.log('Max amplitude:', max);
console.log('Non-zero samples:', nonZeroCount, '/', ch0.length);
console.log('\n' + (max > 0.0001 ? '✅ HAS AUDIO' : '❌ SILENT!'));
