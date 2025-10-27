import { AudioContext } from '../index.js';

console.log('Testing Phase 2 Nodes: ConstantSource, ChannelMerger, ChannelSplitter');

async function testConstantSource() {
    console.log('\n=== Testing ConstantSourceNode ===');
    const context = new AudioContext();

    // Create a constant source (DC offset)
    const constantSource = context.createConstantSource();
    constantSource.offset.value = 0.3; // Output constant 0.3

    // Use it to modulate an oscillator's frequency
    const osc = context.createOscillator();
    osc.frequency.value = 440;

    // Modulate frequency with constant + LFO
    const lfo = context.createOscillator();
    lfo.frequency.value = 5; // 5 Hz

    const lfoGain = context.createGain();
    lfoGain.gain.value = 20; // ±20 Hz

    const freqGain = context.createGain();
    freqGain.gain.value = 50; // Scale constant to ±50 Hz

    // Mix constant + LFO to modulate frequency
    constantSource.connect(freqGain);
    lfo.connect(lfoGain);

    freqGain.connect(osc.frequency);
    lfoGain.connect(osc.frequency);

    const outputGain = context.createGain();
    outputGain.gain.value = 0.3;

    osc.connect(outputGain);
    outputGain.connect(context.destination);

    await context.resume();

    console.log('Playing with ConstantSource + LFO modulation for 2 seconds...');

    constantSource.start();
    lfo.start();
    osc.start();

    await new Promise(resolve => setTimeout(resolve, 2000));

    constantSource.stop();
    lfo.stop();
    osc.stop();
    await context.close();
    console.log('ConstantSource test complete');
}

async function testChannelRouting() {
    console.log('\n=== Testing ChannelMerger/Splitter ===');
    const context = new AudioContext();

    // Create two oscillators with different frequencies
    const osc1 = context.createOscillator();
    osc1.frequency.value = 440; // A4

    const osc2 = context.createOscillator();
    osc2.frequency.value = 554.37; // C#5

    // Create channel merger (merge 2 mono → stereo)
    const merger = context.createChannelMerger(2);

    // Connect osc1 to left channel (input 0)
    // Connect osc2 to right channel (input 1)
    osc1.connect(merger, 0, 0);
    osc2.connect(merger, 0, 1);

    // Output gain
    const gainNode = context.createGain();
    gainNode.gain.value = 0.3;

    merger.connect(gainNode);
    gainNode.connect(context.destination);

    await context.resume();

    console.log('Playing two different tones in left/right channels for 2 seconds...');
    console.log('(440Hz left, 554Hz right - you should hear stereo separation)');

    osc1.start();
    osc2.start();

    await new Promise(resolve => setTimeout(resolve, 2000));

    osc1.stop();
    osc2.stop();
    await context.close();
    console.log('Channel routing test complete');
}

async function runTests() {
    try {
        await testConstantSource();
        await new Promise(resolve => setTimeout(resolve, 500));

        await testChannelRouting();

        console.log('\n✅ All Phase 2 node tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
