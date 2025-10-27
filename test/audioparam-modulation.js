import { AudioContext } from '../index.js';

console.log('Testing AudioParam Modulation (LFO)');

async function testLFOModulation() {
    console.log('\n=== Testing LFO modulating frequency ===');
    const context = new AudioContext();

    // Create carrier oscillator (the sound we'll hear)
    const carrier = context.createOscillator();
    carrier.frequency.value = 440; // A4
    carrier.type = 'sine';

    // Create LFO (Low Frequency Oscillator) to modulate carrier frequency
    const lfo = context.createOscillator();
    lfo.frequency.value = 5; // 5 Hz vibrato
    lfo.type = 'sine';

    // Create gain to control modulation depth
    const lfoGain = context.createGain();
    lfoGain.gain.value = 20; // ±20 Hz vibrato depth

    // Connect LFO -> gain -> carrier.frequency (modulation routing)
    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);

    // Connect carrier to output
    const outputGain = context.createGain();
    outputGain.gain.value = 0.3;
    carrier.connect(outputGain);
    outputGain.connect(context.destination);

    await context.resume();

    console.log('Playing 440Hz with 5Hz LFO vibrato for 3 seconds...');
    console.log('(You should hear the pitch warbling)');

    carrier.start();
    lfo.start();

    await new Promise(resolve => setTimeout(resolve, 3000));

    carrier.stop();
    lfo.stop();
    await context.close();
    console.log('LFO modulation test complete');
}

async function testGainModulation() {
    console.log('\n=== Testing LFO modulating gain (tremolo) ===');
    const context = new AudioContext();

    // Create oscillator
    const osc = context.createOscillator();
    osc.frequency.value = 440;
    osc.type = 'sine';

    // Create LFO for tremolo
    const lfo = context.createOscillator();
    lfo.frequency.value = 4; // 4 Hz tremolo
    lfo.type = 'sine';

    // LFO gain for tremolo depth
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.2; // ±0.2 amplitude modulation

    // Output gain (base level)
    const outputGain = context.createGain();
    outputGain.gain.value = 0.5; // Center at 0.5, LFO will modulate around this

    // Connect LFO -> lfoGain -> outputGain.gain
    lfo.connect(lfoGain);
    lfoGain.connect(outputGain.gain);

    // Connect audio path
    osc.connect(outputGain);
    outputGain.connect(context.destination);

    await context.resume();

    console.log('Playing 440Hz with 4Hz tremolo for 3 seconds...');
    console.log('(You should hear the volume pulsing)');

    osc.start();
    lfo.start();

    await new Promise(resolve => setTimeout(resolve, 3000));

    osc.stop();
    lfo.stop();
    await context.close();
    console.log('Gain modulation test complete');
}

async function runTests() {
    try {
        await testLFOModulation();
        await new Promise(resolve => setTimeout(resolve, 500));

        await testGainModulation();

        console.log('\n✅ All AudioParam modulation tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
