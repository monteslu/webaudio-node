import sdl from '@kmamal/sdl';

console.log('Testing SDL audio device enumeration...\n');

// List audio devices
const devices = sdl.audio.devices;
console.log('Available audio devices:');
for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    console.log(`  [${i}] ${device.name}`);
}

console.log('\nAttempting to open audio device...');

let callbackCount = 0;

try {
    const audioDevice = sdl.audio.openDevice(
        {
            type: 'playback',
            sampleRate: 48000,
            channels: 2,
            format: 'f32',
            buffered: 512
        },
        samples => {
            callbackCount++;

            // Generate 440Hz sine wave
            const freq = 440;
            const sampleRate = 48000;

            for (let i = 0; i < samples.length; i += 2) {
                const t = (callbackCount * 256 + i / 2) / sampleRate;
                const value = Math.sin(2 * Math.PI * freq * t) * 0.3;
                samples[i] = value;
                samples[i + 1] = value;
            }

            if (callbackCount === 1 || callbackCount % 100 === 0) {
                console.log(`Callback #${callbackCount}`);
            }
        }
    );

    console.log('Device opened successfully');
    console.log('Device info:', {
        sampleRate: audioDevice.sampleRate,
        channels: audioDevice.channels,
        format: audioDevice.format,
        buffered: audioDevice.buffered,
        playing: audioDevice.playing,
        queued: audioDevice.queued
    });

    console.log('\nCalling play()...');
    audioDevice.play();

    console.log('Play() called, device.playing =', audioDevice.playing);
    console.log('\nWaiting 3 seconds for callbacks...\n');

    // Keep event loop alive with aggressive polling
    let elapsed = 0;
    const interval = setInterval(() => {
        elapsed += 100;
        if (elapsed % 1000 === 0) {
            console.log(
                `${elapsed / 1000}s - Callbacks so far: ${callbackCount}, queued: ${audioDevice.queued}, playing: ${audioDevice.playing}`
            );
        }
        if (elapsed >= 3000) {
            clearInterval(interval);
            audioDevice.close();
            console.log(`\n✅ Done! Total callbacks: ${callbackCount}`);
            console.log(
                callbackCount > 0 ? '✅ SDL WORKS' : '❌ SDL BROKEN - callbacks never fired'
            );
            process.exit(0);
        }
    }, 100);
} catch (error) {
    console.error('Error opening audio device:', error);
    process.exit(1);
}
