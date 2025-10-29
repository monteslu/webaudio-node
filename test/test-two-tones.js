import { createWebAudioInstance } from '../src/factory.js';

console.log('\n🎵 Testing 2 VERY DISTINCT tones (1 octave apart)...\n');

const instance = await createWebAudioInstance();
const { AudioContext } = instance;

const context = new AudioContext({ sampleRate: 48000 });

// Create master gain
const masterGain = context.createGain();
masterGain.gain.value = 0.3;
masterGain.connect(context.destination);

// Create 2 oscillators an octave apart
const osc1 = context.createOscillator();
osc1.frequency.value = 440; // A4
osc1.type = 'sine';
osc1.connect(masterGain);

const osc2 = context.createOscillator();
osc2.frequency.value = 880; // A5 (one octave higher)
osc2.type = 'sine';
osc2.connect(masterGain);

console.log('Starting first tone (440 Hz) immediately...');
console.log('Starting second tone (880 Hz) after 2 seconds...\n');

await context.resume();

// Start first oscillator immediately
osc1.start(context.currentTime);
osc1.stop(context.currentTime + 6);

// Start second oscillator 2 seconds later
osc2.start(context.currentTime + 2);
osc2.stop(context.currentTime + 6);

console.log('Playing:');
console.log('  t=0-6s: 440 Hz (low tone)');
console.log('  t=2-6s: 880 Hz (high tone) JOINS THE LOW TONE\n');
console.log('You should hear:');
console.log('  - First 2 seconds: Single low tone');
console.log('  - Next 4 seconds: BOTH tones together (should sound fuller/richer)');
console.log('  - If you only hear one tone the whole time, there is a mixing issue\n');

await new Promise(resolve => setTimeout(resolve, 7000));

await context.close();

console.log('✅ Test complete!\n');
