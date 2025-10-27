import sdl from '@kmamal/sdl';

console.log('Testing SDL audio callback...\n');

let callbackCount = 0;
let phase = 0;

const device = sdl.audio.openDevice(
    {
        type: 'playback',
        sampleRate: 48000,
        channels: 2,
        format: 'f32',
        buffered: 256
    },
    samples => {
        callbackCount++;

        // Generate simple sine wave
        const freq = 440;
        const sampleRate = 48000;

        for (let i = 0; i < samples.length; i += 2) {
            const value = Math.sin((2 * Math.PI * freq * phase) / sampleRate) * 0.3;
            samples[i] = value; // Left
            samples[i + 1] = value; // Right
            phase++;
        }

        if (callbackCount % 100 === 0) {
            console.log(`Callback called ${callbackCount} times, phase: ${phase}`);
        }
    }
);

console.log('SDL device opened, starting playback...');
device.play();
console.log('Playing for 2 seconds...\n');

await new Promise(resolve => setTimeout(resolve, 2000));

device.close();
console.log(`\n✅ Done! Callback was called ${callbackCount} times`);
console.log(callbackCount > 0 ? '✅ SDL WORKS' : '❌ SDL BROKEN');
