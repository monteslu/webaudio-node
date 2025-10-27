import { AudioContext } from './index-wasm.js';

console.log('\n🎵 Testing WASM real-time AudioContext...\n');

const ctx = new AudioContext({ sampleRate: 48000 });

// Create simple oscillator
const osc = ctx.createOscillator();
osc.frequency.value = 440;

const gain = ctx.createGain();
gain.gain.value = 0.3;

osc.connect(gain);
gain.connect(ctx.destination);

console.log('Starting playback...');
await ctx.resume();

osc.start(0);

console.log('Playing 440Hz sine wave for 2 seconds...\n');
await new Promise(resolve => setTimeout(resolve, 2000));

osc.stop();
await ctx.close();

console.log('\n✅ Done! Did you hear audio?');
