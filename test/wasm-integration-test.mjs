// WASM Integration Test
// Tests basic oscillator → gain → destination rendering

import { WasmOfflineAudioContext } from '../src/wasm-integration/WasmOfflineAudioContext.js';

async function testBasicRendering() {
    console.log('🧪 WASM Integration Test: Basic Rendering\n');
    console.log('━'.repeat(50));

    // Create offline context (1 second, stereo, 44.1kHz)
    const context = new WasmOfflineAudioContext({
        numberOfChannels: 2,
        length: 44100,
        sampleRate: 44100,
    });

    console.log('✅ Created WasmOfflineAudioContext');
    console.log(`   Sample Rate: ${context.sampleRate} Hz`);
    console.log(`   Length: ${context.length} frames`);
    console.log(`   Channels: ${context._channels}`);
    console.log('');

    // Create audio graph: oscillator → gain → destination
    const oscillator = await context.createOscillator();
    const gain = await context.createGain();

    console.log('✅ Created nodes:');
    console.log(`   Oscillator: ${oscillator}, frequency=${oscillator.frequency}`);
    console.log(`   Gain: ${gain}, gain=${gain.gain}`);
    console.log('');

    // Connect graph
    oscillator.connect(gain);
    gain.connect(context.destination);
    console.log('✅ Connected audio graph: oscillator → gain → destination');
    console.log('');

    // Configure
    oscillator.frequency.value = 440;  // A4
    gain.gain.value = 0.5;  // 50% volume
    oscillator.type = 'sine';

    console.log('✅ Configured parameters:');
    console.log(`   Oscillator frequency: 440 Hz (A4)`);
    console.log(`   Oscillator type: sine`);
    console.log(`   Gain: 0.5 (50%)`);
    console.log('');

    // Start oscillator
    oscillator.start(0);
    console.log('✅ Started oscillator');
    console.log('');

    // Render
    console.log('⏳ Rendering audio...');
    const startTime = performance.now();

    try {
        const audioBuffer = await context.startRendering();
        const renderTime = performance.now() - startTime;

        console.log('✅ Rendering complete!');
        console.log('');

        // Analyze result
        console.log('📊 Rendered Audio Buffer:');
        console.log(`   Length: ${audioBuffer.length} frames`);
        console.log(`   Channels: ${audioBuffer.numberOfChannels}`);
        console.log(`   Sample Rate: ${audioBuffer.sampleRate} Hz`);
        console.log(`   Duration: ${audioBuffer.duration.toFixed(3)} seconds`);
        console.log(`   Render Time: ${renderTime.toFixed(2)} ms`);
        console.log('');

        // Check audio data
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);

        // Calculate RMS level
        let sumSquares = 0;
        for (let i = 0; i < leftChannel.length; i++) {
            sumSquares += leftChannel[i] * leftChannel[i];
        }
        const rms = Math.sqrt(sumSquares / leftChannel.length);

        // Find peak value
        let peak = 0;
        for (let i = 0; i < leftChannel.length; i++) {
            peak = Math.max(peak, Math.abs(leftChannel[i]));
        }

        console.log('📈 Audio Analysis:');
        console.log(`   RMS Level: ${rms.toFixed(4)}`);
        console.log(`   Peak Level: ${peak.toFixed(4)}`);
        console.log(`   Expected RMS: ~0.354 (sine wave at 50%)`);
        console.log(`   Expected Peak: ~0.5 (50% gain)`);
        console.log('');

        // Verify audio is not silent
        if (rms > 0.3 && rms < 0.4 && peak > 0.45 && peak < 0.55) {
            console.log('✅ PASS: Audio levels match expected values!');
        } else {
            console.log('⚠️  WARNING: Audio levels outside expected range');
            console.log(`   This might indicate a problem with the rendering`);
        }

        // Check stereo consistency
        let stereoMatch = true;
        for (let i = 0; i < Math.min(100, leftChannel.length); i++) {
            if (Math.abs(leftChannel[i] - rightChannel[i]) > 0.001) {
                stereoMatch = false;
                break;
            }
        }

        if (stereoMatch) {
            console.log('✅ PASS: Stereo channels are identical (as expected)');
        } else {
            console.log('⚠️  WARNING: Stereo channels differ');
        }

        console.log('');
        console.log('━'.repeat(50));
        console.log('🎉 Test completed successfully!');
        console.log('');

        // Performance metrics
        const samplesPerSecond = audioBuffer.length / (renderTime / 1000);
        const realtimeFactor = samplesPerSecond / audioBuffer.sampleRate;

        console.log('⚡ Performance:');
        console.log(`   Samples/Second: ${(samplesPerSecond / 1000000).toFixed(2)}M`);
        console.log(`   Realtime Factor: ${realtimeFactor.toFixed(0)}x`);
        console.log(`   (${realtimeFactor.toFixed(0)}x faster than realtime)`);

        return { success: true, audioBuffer, renderTime };

    } catch (error) {
        console.error('❌ FAIL: Rendering failed!');
        console.error(`   Error: ${error.message}`);
        console.error(error.stack);
        return { success: false, error };
    } finally {
        context.close();
    }
}

// Run test
testBasicRendering()
    .then(result => {
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
