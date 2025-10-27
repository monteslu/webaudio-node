import { AudioContext } from '../src/javascript/index.js';

console.log('\n=== Testing PeriodicWave (Custom Waveforms) ===\n');

const context = new AudioContext({ sampleRate: 44100 });

// Test 1: Square wave from Fourier series
console.log('Test 1: Square wave from Fourier series');
console.log('  Square wave = sum of odd harmonics: sin(x) + 1/3*sin(3x) + 1/5*sin(5x) + ...');

// Square wave: only odd harmonics with 1/n amplitude
const squareReal = new Float32Array(32).fill(0);
const squareImag = new Float32Array(32);
for (let i = 0; i < squareImag.length; i++) {
    if (i % 2 === 1) {
        // Odd harmonics only
        squareImag[i] = 1.0 / i;
    } else {
        squareImag[i] = 0;
    }
}

const squareWave = context.createPeriodicWave(squareReal, squareImag);
console.log('  Created PeriodicWave with', squareImag.length, 'coefficients');
console.log('  Wavetable size:', squareWave.wavetable.length);

const osc1 = context.createOscillator();
osc1.setPeriodicWave(squareWave);
osc1.frequency.value = 220; // A3

const gain1 = context.createGain();
gain1.gain.value = 0.3;

osc1.connect(gain1);
gain1.connect(context.destination);

await context.resume();
console.log('  Playing custom square wave (220 Hz) for 1 second...');
osc1.start();
await new Promise(resolve => setTimeout(resolve, 1000));
osc1.stop();

// Test 2: Sawtooth wave from Fourier series
console.log('\nTest 2: Sawtooth wave from Fourier series');
console.log('  Sawtooth = sum of all harmonics: sin(x) - 1/2*sin(2x) + 1/3*sin(3x) - ...');

const sawtoothReal = new Float32Array(32).fill(0);
const sawtoothImag = new Float32Array(32);
for (let i = 1; i < sawtoothImag.length; i++) {
    sawtoothImag[i] = (i % 2 === 0 ? -1 : 1) / i;
}

const sawtoothWave = context.createPeriodicWave(sawtoothReal, sawtoothImag);

const osc2 = context.createOscillator();
osc2.setPeriodicWave(sawtoothWave);
osc2.frequency.value = 220;

const gain2 = context.createGain();
gain2.gain.value = 0.3;

osc2.connect(gain2);
gain2.connect(context.destination);

console.log('  Playing custom sawtooth wave (220 Hz) for 1 second...');
osc2.start();
await new Promise(resolve => setTimeout(resolve, 1000));
osc2.stop();

// Test 3: Custom harmonic content (organ-like)
console.log('\nTest 3: Custom harmonic content (organ-like timbre)');
console.log('  Using specific harmonics: fundamental + 2nd + 3rd + 5th');

const organReal = new Float32Array([0, 0, 0, 0, 0, 0]); // No DC or cosine terms
const organImag = new Float32Array([
    0, // DC (always 0)
    1.0, // Fundamental
    0.5, // 2nd harmonic
    0.3, // 3rd harmonic
    0, // 4th harmonic (skip)
    0.2 // 5th harmonic
]);

const organWave = context.createPeriodicWave(organReal, organImag);

const osc3 = context.createOscillator();
osc3.setPeriodicWave(organWave);
osc3.frequency.value = 220;

const gain3 = context.createGain();
gain3.gain.value = 0.3;

osc3.connect(gain3);
gain3.connect(context.destination);

console.log('  Playing custom organ-like timbre (220 Hz) for 1 second...');
osc3.start();
await new Promise(resolve => setTimeout(resolve, 1000));
osc3.stop();

// Test 4: Test disableNormalization option
console.log('\nTest 4: Testing disableNormalization option');

const wave1 = context.createPeriodicWave(organReal, organImag, { disableNormalization: false });
const wave2 = context.createPeriodicWave(organReal, organImag, { disableNormalization: true });

console.log('  Normalized wave max:', Math.max(...wave1.wavetable.map(Math.abs)).toFixed(4));
console.log('  Unnormalized wave max:', Math.max(...wave2.wavetable.map(Math.abs)).toFixed(4));

await context.suspend();
await context.close();

console.log('\n✅ PeriodicWave test complete!');
console.log('\nPeriodicWave features:');
console.log('  ✓ Create custom waveforms from Fourier coefficients');
console.log('  ✓ Real and imaginary parts support');
console.log('  ✓ Automatic wavetable generation');
console.log('  ✓ Optional normalization');
console.log('  ✓ Used with OscillatorNode.setPeriodicWave()');
