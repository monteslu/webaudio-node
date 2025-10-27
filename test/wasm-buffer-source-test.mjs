// Test BufferSourceNode with WASM backend

import { WasmOfflineAudioContext } from '../src/wasm-integration/WasmOfflineAudioContext.js';
import { AudioBuffer } from '../src/javascript/AudioBuffer.js';

async function testBufferSource() {
    console.log('🎬 Testing BufferSourceNode with WASM\n');

    const sampleRate = 44100;
    const duration = 0.5;  // 0.5 seconds
    const context = new WasmOfflineAudioContext({
        numberOfChannels: 2,
        length: Math.floor(sampleRate * duration),
        sampleRate: sampleRate
    });

    // Create a simple sine wave buffer (440Hz)
    const bufferLength = Math.floor(sampleRate * 0.1);  // 0.1 second buffer
    const bufferChannels = 2;
    const bufferData = new Float32Array(bufferLength * bufferChannels);

    // Fill with sine wave
    const frequency = 440;
    for (let i = 0; i < bufferLength; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
        bufferData[i * 2] = sample;       // Left channel
        bufferData[i * 2 + 1] = sample;   // Right channel
    }

    console.log('📊 Created test buffer:');
    console.log(`   Length: ${bufferLength} frames`);
    console.log(`   Channels: ${bufferChannels}`);
    console.log(`   Sample rate: ${sampleRate} Hz`);
    console.log(`   Duration: ${(bufferLength / sampleRate * 1000).toFixed(1)}ms`);
    console.log('');

    // Create buffer source node
    const bufferSource = context.createBufferSource();

    // Create an AudioBuffer
    const sourceBuffer = new AudioBuffer({
        length: bufferLength,
        numberOfChannels: bufferChannels,
        sampleRate: sampleRate
    });

    // Copy data to buffer channels
    for (let ch = 0; ch < bufferChannels; ch++) {
        const channelData = sourceBuffer.getChannelData(ch);
        for (let i = 0; i < bufferLength; i++) {
            channelData[i] = bufferData[i * bufferChannels + ch];
        }
    }

    // Set buffer on source
    bufferSource.buffer = sourceBuffer;

    // Connect and play
    bufferSource.connect(context.destination);
    bufferSource.start(0);

    console.log('⏳ Rendering...\n');

    const renderedBuffer = await context.startRendering();

    // Analyze output
    const channel0 = renderedBuffer.getChannelData(0);
    let peak = 0;
    let rms = 0;
    for (let i = 0; i < channel0.length; i++) {
        peak = Math.max(peak, Math.abs(channel0[i]));
        rms += channel0[i] * channel0[i];
    }
    rms = Math.sqrt(rms / channel0.length);

    console.log('📈 Audio Analysis:');
    console.log(`   RMS Level: ${rms.toFixed(4)}`);
    console.log(`   Peak Level: ${peak.toFixed(4)}`);
    console.log('   Expected Peak: ~1.0 (full amplitude sine wave)');
    console.log('');

    // Verify we got audio
    if (peak > 0.9 && peak < 1.1 && rms > 0.6 && rms < 0.8) {
        console.log('✅ PASS: Buffer source playback working correctly!\n');
    } else {
        console.log('❌ FAIL: Unexpected audio levels\n');
    }

    // Cleanup
    context.close();

    console.log('🎉 Test complete!\n');
}

testBufferSource().catch(console.error);
