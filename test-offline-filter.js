import { OfflineAudioContext } from './src/javascript/index.js';

console.log('\n🧪 Testing offline rendering with filters...\n');

const ctx = new OfflineAudioContext({
	numberOfChannels: 2,
	length: 48000,
	sampleRate: 48000
});

// Create oscillator -> filter -> gain chain
const osc = ctx.createOscillator();
osc.frequency.value = 440;

const filter = ctx.createBiquadFilter();
filter.type = 'lowpass';
filter.frequency.value = 2000;

const gain = ctx.createGain();
gain.gain.value = 0.5;

osc.connect(filter);
filter.connect(gain);
gain.connect(ctx.destination);

osc.start(0);

console.log('Rendering with oscillator -> filter -> gain...');
const buffer = await ctx.startRendering();

const data = buffer.getChannelData(0);
console.log('First 10 samples:', data.slice(0, 10));

let max = 0;
for (let i = 0; i < data.length; i++) {
	max = Math.max(max, Math.abs(data[i]));
}

console.log('Max amplitude:', max);
console.log(max > 0.0001 ? '\n✅ FILTERS WORK' : '\n❌ FILTERS BROKEN');
