import { AudioContext } from '../src/javascript/index.js';

console.log('\n🔊 Audio Device Information\n');

const context = new AudioContext({ sampleRate: 48000 });

console.log('AudioContext properties:');
console.log('  Sample rate:', context.sampleRate);
console.log('  State:', context.state);
console.log('  Destination channels:', context.destination.maxChannelCount);

// Create a simple test tone
const osc = context.createOscillator();
osc.frequency.value = 440; // A4

const gain = context.createGain();
gain.gain.value = 0.3; // 30% volume

osc.connect(gain);
gain.connect(context.destination);

console.log('\nPlaying 440 Hz test tone for 2 seconds...');
console.log('You should hear a steady tone.');
console.log('If you hear nothing, there may be an audio device issue.\n');

await context.resume();
console.log('Context resumed, state:', context.state);

osc.start();

// Monitor time
for (let i = 0; i < 4; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Time: ${context.currentTime.toFixed(2)}s`);
}

osc.stop();
await context.close();

console.log('\n✅ Test complete\n');
