import { AudioContext } from '../src/javascript/index.js';

console.log('\n=== Testing ConvolverNode ===\n');

const context = new AudioContext({ sampleRate: 44100 });

// Create a simple impulse response (short echo)
const impulseLength = 44100; // 1 second
const impulseBuffer = context.createBuffer(2, impulseLength, 44100);

// Create a simple impulse: original signal + echo at 0.5 seconds
const leftChannel = impulseBuffer.getChannelData(0);
const rightChannel = impulseBuffer.getChannelData(1);

// Impulse at time 0 (original signal)
leftChannel[0] = 1.0;
rightChannel[0] = 1.0;

// Echo at 0.5 seconds (half amplitude)
const echoDelay = Math.floor(44100 * 0.5);
leftChannel[echoDelay] = 0.5;
rightChannel[echoDelay] = 0.5;

// Another echo at 0.75 seconds (quarter amplitude)
const echo2Delay = Math.floor(44100 * 0.75);
leftChannel[echo2Delay] = 0.25;
rightChannel[echo2Delay] = 0.25;

console.log('Created impulse response:');
console.log(`  Length: ${impulseLength} samples (${impulseLength / 44100}s)`);
console.log(`  Channels: 2 (stereo)`);
console.log(`  Echoes: 0.5s (50%), 0.75s (25%)`);

// Create convolver node
const convolver = context.createConvolver();
console.log('\nCreated ConvolverNode');
console.log(`  normalize: ${convolver.normalize}`);

// Set the impulse response
convolver.buffer = impulseBuffer;
console.log('Set impulse response buffer');

// Test normalize property
convolver.normalize = false;
console.log(`  normalize set to: ${convolver.normalize}`);
convolver.normalize = true;
console.log(`  normalize set to: ${convolver.normalize}`);

// Create a test signal (440Hz tone, 0.5s)
const oscillator = context.createOscillator();
oscillator.frequency.value = 440;
oscillator.type = 'sine';

const gain = context.createGain();
gain.gain.value = 0.3; // Quiet so we don't clip with echoes

// Connect: oscillator -> gain -> convolver -> destination
oscillator.connect(gain);
gain.connect(convolver);
convolver.connect(context.destination);

console.log('\nAudio graph:');
console.log('  Oscillator (440Hz) -> Gain (0.3) -> Convolver -> Destination');

console.log('\nPlaying convolved sound (2 seconds)...');
console.log('  You should hear the tone with echoes at 0.5s and 0.75s');

await context.resume();
oscillator.start();

// Play for 2 seconds
await new Promise(resolve => setTimeout(resolve, 2000));

oscillator.stop();
await new Promise(resolve => setTimeout(resolve, 100));

await context.suspend();
await context.close();

console.log('\n✅ ConvolverNode test complete!');
