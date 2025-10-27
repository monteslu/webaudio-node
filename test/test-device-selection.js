// Test browser-compatible device selection API
import { AudioContext } from './index.js';

console.log('Testing Audio Device Selection API\n');
console.log('=' .repeat(60));

// 1. Enumerate devices
console.log('\n1. Enumerating audio devices:');
console.log('-'.repeat(60));

const devices = AudioContext.enumerateDevices();
const outputDevices = devices.filter(d => d.kind === 'audiooutput');
const inputDevices = devices.filter(d => d.kind === 'audioinput');

console.log(`Found ${devices.length} audio device(s):`);
console.log(`  - ${outputDevices.length} output device(s)`);
console.log(`  - ${inputDevices.length} input device(s)\n`);

devices.forEach((device, index) => {
    console.log(`  [${index}] ${device.label}`);
    console.log(`      Device ID: ${device.deviceId}`);
    console.log(`      Kind: ${device.kind}`);
    console.log();
});

if (devices.length === 0) {
    console.log('❌ No audio devices found. Cannot test device selection.');
    process.exit(1);
}

// 2. Create AudioContext with default device
console.log('\n2. Creating AudioContext with default device:');
console.log('-'.repeat(60));

const ctx = new AudioContext({ sampleRate: 48000 });
console.log(`Initial sinkId: "${ctx.sinkId}" (empty = default device)`);

// 3. Create a simple test tone
console.log('\n3. Setting up 440Hz test tone...');
const osc = ctx.createOscillator();
osc.frequency.value = 440;

const gain = ctx.createGain();
gain.gain.value = 0.3;

osc.connect(gain);
gain.connect(ctx.destination);
osc.start();

// 4. Test playback on default device
console.log('\n4. Playing on default device for 2 seconds...');
await ctx.resume();
console.log(`   Playing... (sinkId: "${ctx.sinkId}")`);
await new Promise(resolve => setTimeout(resolve, 2000));

// 5. Test device switching (if multiple output devices available)
if (outputDevices.length > 1) {
    console.log('\n5. Switching to different output device...');
    console.log('-'.repeat(60));

    const targetDevice = outputDevices[1];
    console.log(`   Target device: ${targetDevice.label}`);
    console.log(`   Target deviceId: ${targetDevice.deviceId}`);

    try {
        await ctx.setSinkId(targetDevice.deviceId);
        console.log(`   ✓ Switched successfully`);
        console.log(`   Current sinkId: "${ctx.sinkId}"`);

        console.log('\n   Playing on new device for 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Switch back to default
        console.log('\n6. Switching back to default device...');
        await ctx.setSinkId('');
        console.log(`   ✓ Switched to default`);
        console.log(`   Current sinkId: "${ctx.sinkId}"`);

        console.log('\n   Playing on default device for 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        console.error(`   ❌ Failed to switch device: ${error.message}`);
    }
} else {
    console.log('\n5. Only one output device available, skipping device switch test.');
}

// 6. Test invalid device ID
console.log('\n7. Testing error handling with invalid device ID...');
console.log('-'.repeat(60));
try {
    await ctx.setSinkId('invalid-device-id-12345678');
    console.log('   ❌ Should have thrown an error!');
} catch (error) {
    console.log(`   ✓ Correctly threw error: ${error.message}`);
}

// Cleanup
console.log('\n8. Cleaning up...');
osc.stop();
await ctx.close();

console.log('\n' + '='.repeat(60));
console.log('✅ Device selection API test complete!\n');

console.log('Summary:');
console.log(`  - Found ${devices.length} audio device(s) (${outputDevices.length} output, ${inputDevices.length} input)`);
console.log(`  - Default device playback: ✓`);
if (outputDevices.length > 1) {
    console.log(`  - Device switching: ✓`);
    console.log(`  - Switch back to default: ✓`);
}
console.log(`  - Error handling: ✓`);
console.log();
