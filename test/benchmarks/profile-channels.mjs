import { OfflineAudioContext as CppContext } from '../../index.js';

const channelCount = 8;
const sampleRate = 48000;
const duration = 1.0;
const length = Math.floor(sampleRate * duration);

console.log(`Profiling ${channelCount}-channel rendering...\n`);

const ctx = new CppContext({
	numberOfChannels: channelCount,
	length: length,
	sampleRate: sampleRate
});

const osc = ctx.createOscillator();
osc.type = 'sawtooth';
osc.frequency.value = 440;

const filter = ctx.createBiquadFilter();
filter.type = 'lowpass';
filter.frequency.value = 2000;
filter.Q.value = 1.0;

const gain = ctx.createGain();
gain.gain.gain.value = 0.5;

osc.connect(filter);
filter.connect(gain);
gain.connect(ctx.destination);

osc.start(0);

const start = performance.now();
await ctx.startRendering();
const elapsed = performance.now() - start;

console.log(`Rendered ${length} frames x ${channelCount} channels in ${elapsed.toFixed(2)}ms`);
console.log(`Throughput: ${((length * channelCount) / (elapsed / 1000) / 1000000).toFixed(2)}M samples/sec`);
