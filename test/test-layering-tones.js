import { createWebAudioInstance } from '../src/factory.js';

console.log('\n🎵 Testing 5 layered TONES (should be unmistakable)...\n');

const instance = await createWebAudioInstance();
const { AudioContext } = instance;

const context = new AudioContext({ sampleRate: 48000 });

// Create master gain
const masterGain = context.createGain();
masterGain.gain.value = 0.3;
masterGain.connect(context.destination);

// Create 5 oscillators at different frequencies (musical chord: C major)
const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5
const oscillators = [];

console.log('Creating 5 oscillators with different frequencies:');
for (let i = 0; i < 5; i++) {
    const osc = context.createOscillator();
    osc.frequency.value = frequencies[i];
    osc.type = 'sine';

    const gain = context.createGain();
    gain.gain.value = 0.5;

    osc.connect(gain);
    gain.connect(masterGain);

    console.log(`  Oscillator ${i + 1}: ${frequencies[i].toFixed(2)} Hz, starts at ${i}s`);
    oscillators.push({ osc, gain });
}

console.log('\nStarting playback - listen for notes joining every second:');
await context.resume();

// Schedule each oscillator to start 1 second apart
for (let i = 0; i < 5; i++) {
    const startTime = context.currentTime + i;
    oscillators[i].osc.start(startTime);
    oscillators[i].osc.stop(startTime + 8); // Play for 8 seconds after starting
}

console.log('Playing for 12 seconds...');
console.log('- At t=0s: First note starts (C)');
console.log('- At t=1s: Second note joins (E)');
console.log('- At t=2s: Third note joins (G)');
console.log('- At t=3s: Fourth note joins (C)');
console.log('- At t=4s: Fifth note joins (E) - full chord!\n');

await new Promise(resolve => setTimeout(resolve, 12000));

await context.close();

console.log('\n✅ If you heard notes joining to form a chord, layering works!');
console.log('If you only heard one note, there\'s still a problem.\n');
