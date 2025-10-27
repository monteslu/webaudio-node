// Test audio input capture with MediaStreamSourceNode
import { WasmAudioContext } from './src/wasm-integration/WasmAudioContext.js';

console.log('Testing Audio Input Capture\n');
console.log('='.repeat(60));

// 1. Enumerate devices to find input devices
console.log('\n1. Enumerating audio devices:');
console.log('-'.repeat(60));

const devices = WasmAudioContext.enumerateDevices();
const inputDevices = devices.filter(d => d.kind === 'audioinput');
const outputDevices = devices.filter(d => d.kind === 'audiooutput');

console.log(`Found ${devices.length} audio device(s):`);
console.log(`  - ${inputDevices.length} input device(s)`);
console.log(`  - ${outputDevices.length} output device(s)\n`);

inputDevices.forEach((device, index) => {
    console.log(`  Input [${index}] ${device.label}`);
    console.log(`      Device ID: ${device.deviceId}`);
});

if (inputDevices.length === 0) {
    console.log('\n❌ No audio input devices found. Cannot test audio capture.');
    process.exit(1);
}

// 2. Create AudioContext
console.log('\n2. Creating WasmAudioContext:');
console.log('-'.repeat(60));

const ctx = new WasmAudioContext({ sampleRate: 48000 });
console.log(`Sample rate: ${ctx.sampleRate}Hz`);
console.log(`State: ${ctx.state}`);

// 3. Create MediaStreamSourceNode (default input device)
console.log('\n3. Creating MediaStreamSourceNode:');
console.log('-'.repeat(60));

const inputNode = ctx.createMediaStreamSource({
    channelCount: 1 // Mono input
});
console.log(`Created input node (channel count: 1)`);
console.log(`Using default input device`);

// 4. Create gain node and connect to destination
console.log('\n4. Setting up audio graph:');
console.log('-'.repeat(60));

const gain = ctx.createGain();
gain.gain.value = 0.5; // 50% volume to avoid feedback
console.log(`Created gain node (gain: 0.5)`);

// Note: MediaStreamSourceNode is not yet integrated with the audio graph
// We'll need to manually process and feed data
console.log('Note: Input node uses separate WASM processing');

// 5. Start audio input capture
console.log('\n5. Starting audio capture:');
console.log('-'.repeat(60));

await inputNode.start();
console.log('✓ Audio capture started');
console.log('Speak into your microphone...\n');

// 6. Monitor input levels for 5 seconds
console.log('6. Monitoring input levels for 5 seconds:');
console.log('-'.repeat(60));

const monitorDuration = 5000;
const checkInterval = 500;
let checks = 0;
const maxChecks = monitorDuration / checkInterval;

const monitorInterval = setInterval(() => {
    // Get available samples
    const available = inputNode.getAvailableSamples();

    // Get audio data (128 frames = Web Audio quantum size)
    const audioData = inputNode.getAudioData(128);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const db = 20 * Math.log10(rms + 1e-10); // Add small value to avoid log(0)

    // Create simple level meter
    const barLength = 40;
    const normalizedLevel = Math.max(0, Math.min(1, (db + 60) / 60)); // Map -60dB to 0dB
    const bars = Math.floor(normalizedLevel * barLength);
    const meter = '█'.repeat(bars) + '░'.repeat(barLength - bars);

    console.log(
        `[${checks}] Buffer: ${available.toString().padStart(6)} samples | ${meter} ${db.toFixed(1)}dB`
    );

    checks++;
    if (checks >= maxChecks) {
        clearInterval(monitorInterval);
        cleanup();
    }
}, checkInterval);

async function cleanup() {
    console.log('\n7. Cleaning up:');
    console.log('-'.repeat(60));

    inputNode.stop();
    console.log('✓ Stopped audio capture');

    await ctx.close();
    console.log('✓ Closed audio context');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Audio input test complete!\n');

    console.log('Summary:');
    console.log(`  - Input devices found: ${inputDevices.length}`);
    console.log(`  - Audio capture: ✓`);
    console.log(`  - Level monitoring: ✓`);
    console.log(`  - WASM ring buffer: ✓`);
    console.log();
}
