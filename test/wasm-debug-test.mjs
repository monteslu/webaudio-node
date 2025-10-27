// Quick debug test to check audio graph connections

import { WasmOfflineAudioContext } from '../src/wasm-integration/WasmOfflineAudioContext.js';

async function debugTest() {
    console.log('🔍 Debug Test: Check Audio Graph\n');

    const context = new WasmOfflineAudioContext({
        numberOfChannels: 2,
        length: 128,  // Just 1 block
        sampleRate: 44100
    });

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    console.log('Node IDs:');
    console.log('  Oscillator:', oscillator._nodeId);
    console.log('  Gain:', gain._nodeId);
    console.log('  Destination:', context.destination._nodeId);
    console.log('');

    // Connect
    oscillator.connect(gain);
    gain.connect(context.destination);

    console.log('After connections:');
    console.log('Engine nodes:', Array.from(context._engine.nodes.keys()));

    for (const [id, node] of context._engine.nodes.entries()) {
        console.log(`\nNode ${id} (${node.type}):`);
        console.log('  Inputs:', node.inputs);
        console.log('  Outputs:', node.outputs);
    }

    // Configure
    oscillator.frequency.value = 440;
    gain.gain.value = 0.5;
    oscillator.start(0);

    console.log('\n⏳ Rendering...\n');

    const audioBuffer = await context.startRendering();

    // Check first few samples
    const channel0 = audioBuffer.getChannelData(0);
    console.log('First 10 samples:');
    for (let i = 0; i < 10; i++) {
        console.log(`  [${i}]: ${channel0[i].toFixed(4)}`);
    }

    // Check peak
    let peak = 0;
    for (let i = 0; i < channel0.length; i++) {
        peak = Math.max(peak, Math.abs(channel0[i]));
    }

    console.log(`\nPeak value: ${peak.toFixed(4)}`);
    console.log('Expected: ~0.5 (with 50% gain)');
    console.log(`Actual is: ${peak > 0.9 ? 'WRONG (no gain applied!)' : 'correct'}`);

    context.close();
}

debugTest().catch(console.error);
