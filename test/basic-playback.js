import { AudioContext } from '../index.js';

console.log('Testing WebAudio-Node High Performance Architecture');

async function testOscillator() {
    console.log('\n=== Testing Oscillator ===');
    const context = new AudioContext();

    const oscillator = context.createOscillator();
    oscillator.frequency.value = 440; // A4
    oscillator.type = 'sine';

    const gainNode = context.createGain();
    gainNode.gain.value = 0.3;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    await context.resume();

    oscillator.start();
    console.log('Playing 440Hz sine wave for 2 seconds...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    oscillator.stop();
    await context.close();
    console.log('Oscillator test complete');
}

async function testGainAutomation() {
    console.log('\n=== Testing Gain Automation ===');
    const context = new AudioContext();

    const oscillator = context.createOscillator();
    oscillator.frequency.value = 880; // A5
    oscillator.type = 'square';

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(0.0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 1.0);
    gainNode.gain.linearRampToValueAtTime(0.0, context.currentTime + 2.0);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    await context.resume();

    oscillator.start();
    console.log('Playing with gain automation (fade in/out)...');

    await new Promise(resolve => setTimeout(resolve, 2500));

    oscillator.stop();
    await context.close();
    console.log('Gain automation test complete');
}

async function testMixing() {
    console.log('\n=== Testing Multiple Oscillators (Mixing) ===');
    const context = new AudioContext();

    // Create chord (C major)
    const frequencies = [261.63, 329.63, 392.0]; // C4, E4, G4
    const oscillators = [];
    const gainNode = context.createGain();
    gainNode.gain.value = 0.2; // Reduce volume for multiple oscillators

    for (const freq of frequencies) {
        const osc = context.createOscillator();
        osc.frequency.value = freq;
        osc.type = 'sine';
        osc.connect(gainNode);
        oscillators.push(osc);
    }

    gainNode.connect(context.destination);

    await context.resume();

    oscillators.forEach(osc => osc.start());
    console.log('Playing C major chord (mixing 3 oscillators)...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    oscillators.forEach(osc => osc.stop());
    await context.close();
    console.log('Mixing test complete');
}

async function runTests() {
    try {
        await testOscillator();
        await new Promise(resolve => setTimeout(resolve, 500));

        await testGainAutomation();
        await new Promise(resolve => setTimeout(resolve, 500));

        await testMixing();

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

runTests();
