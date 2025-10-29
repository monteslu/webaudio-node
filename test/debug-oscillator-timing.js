import { createWebAudioInstance } from '../src/factory.js';

console.log('\n🔍 DEBUG: Oscillator timing test...\n');

const instance = await createWebAudioInstance();
const { AudioContext } = instance;

const context = new AudioContext({ sampleRate: 48000 });

// Create 3 oscillators for simple test
const oscillators = [];
for (let i = 0; i < 3; i++) {
    const osc = context.createOscillator();
    osc.frequency.value = 440 * (i + 1); // 440, 880, 1320 Hz
    osc.connect(context.destination);
    oscillators.push(osc);
    console.log(`Created oscillator ${i + 1}: ${osc.frequency.value}Hz, nodeId=${osc._nodeId}`);
}

console.log('\nBefore resume:');
console.log(`  currentTime: ${context.currentTime}`);

await context.resume();

console.log('\nAfter resume:');
console.log(`  currentTime: ${context.currentTime}`);

// Start oscillators at 0s, 0.5s, 1.0s
for (let i = 0; i < 3; i++) {
    const startTime = context.currentTime + (i * 0.5);
    console.log(`\nScheduling oscillator ${i + 1} to start at ${startTime.toFixed(3)}`);
    oscillators[i].start(startTime);
    oscillators[i].stop(startTime + 2); // Play for 2 seconds
}

// Monitor timing for 3 seconds
console.log('\nMonitoring timing:');
for (let t = 0; t < 6; t++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`  t=${(t * 0.5).toFixed(1)}s: currentTime=${context.currentTime.toFixed(3)}`);
}

await context.close();
console.log('\n✅ Debug test complete\n');
