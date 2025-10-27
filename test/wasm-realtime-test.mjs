// Test WasmAudioContext with SDL real-time playback

import { WasmAudioContext } from '../src/wasm-integration/WasmAudioContext.js';

async function testRealTimePlayback() {
    console.log('🎵 Testing WASM Real-Time Audio Playback\n');

    // Create context
    const context = new WasmAudioContext({
        sampleRate: 44100,
        numberOfChannels: 2,
        bufferSize: 128
    });

    console.log('✅ Created WasmAudioContext');
    console.log(`   Sample Rate: ${context.sampleRate} Hz`);
    console.log(`   Channels: ${context._channels}`);
    console.log(`   State: ${context.state}`);
    console.log('');

    // Create audio graph: oscillator → gain → destination
    const oscillator = await context.createOscillator();
    const gain = await context.createGain();

    oscillator.frequency.value = 440; // A4
    gain.gain.value = 0.2; // 20% volume (gentle)

    oscillator.connect(gain);
    gain.connect(context.destination);

    console.log('✅ Created audio graph: 440Hz sine → gain(0.2) → speakers');
    console.log('');

    // Start oscillator
    oscillator.start(0);
    console.log('✅ Started oscillator');

    // Resume audio context (starts SDL playback)
    await context.resume();
    console.log(`✅ Audio context resumed, state: ${context.state}`);
    console.log('');

    console.log('🔊 Playing 440Hz tone for 2 seconds...');
    console.log('');

    // Play for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Stop
    oscillator.stop();
    await context.suspend();

    console.log('✅ Stopped playback');
    console.log('');

    // Clean up
    await context.close();
    console.log('✅ Context closed');
    console.log('');
    console.log('🎉 Test complete!');
}

testRealTimePlayback().catch(console.error);
