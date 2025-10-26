import { AudioContext } from '../src/javascript/index.js';

console.log('\n🔊 LOUD AUDIO TEST - Lower your system volume first!\n');
console.log('WARNING: This will play a loud tone. Be careful!\n');

await new Promise(resolve => setTimeout(resolve, 2000));

const context = new AudioContext({ sampleRate: 48000 });

// Create a LOUD oscillator
const osc = context.createOscillator();
osc.frequency.value = 440; // A4

const gain = context.createGain();
gain.gain.value = 0.8; // 80% volume - LOUD

osc.connect(gain);
gain.connect(context.destination);

console.log('Playing LOUD 440 Hz tone for 1 second...');
console.log('If you cannot hear this, there is a system audio configuration issue.\n');

await context.resume();
osc.start();

await new Promise(resolve => setTimeout(resolve, 1000));

osc.stop();
await context.close();

console.log('\n✅ Test complete\n');
