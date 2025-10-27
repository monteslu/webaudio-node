import { AudioContext } from '../src/javascript/index.js';

console.log('🎤 Microphone Input Example\n');
console.log('This example demonstrates capturing audio from your microphone\n');

const ctx = new AudioContext({ sampleRate: 48000, channels: 2 });

// List available input devices
console.log('📋 Available input devices:');
const devices = await ctx.getInputDevices();
if (devices.length === 0) {
    console.log('   ⚠️  No input devices found!');
    console.log('   Make sure you have a microphone connected.\n');
    process.exit(1);
}

devices.forEach(device => {
    console.log(`   [${device.id}] ${device.name}`);
});
console.log('');

// Create microphone source (uses device 0 by default)
const deviceIndex = 0;
console.log(`🎙️  Creating microphone source using device ${deviceIndex}...\n`);
const micSource = ctx.createMediaStreamSource({ deviceIndex });

// Create analyser for visualizing input
const analyser = ctx.createAnalyser();
analyser.fftSize = 2048;

// Create gain for volume control
const inputGain = ctx.createGain();
inputGain.gain.value = 1.0;

// Connect: mic -> analyser -> gain -> destination
micSource.connect(analyser);
analyser.connect(inputGain);
inputGain.connect(ctx.destination);

// Start capturing
console.log('▶️  Starting microphone capture...');
const started = await micSource.start();

if (!started) {
    console.log('❌ Failed to start microphone capture');
    process.exit(1);
}

console.log('✅ Microphone is live! You should hear yourself through the speakers.');
console.log('   (Reduce volume to avoid feedback)\n');

// Resume audio context
await ctx.resume();

// Monitor audio levels
const dataArray = new Float32Array(analyser.fftSize);
let updateCount = 0;

const monitorInterval = setInterval(() => {
    analyser.getFloatTimeDomainData(dataArray);

    // Calculate RMS (volume level)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const db = 20 * Math.log10(rms);

    // Create simple volume bar
    const bars = Math.max(0, Math.min(50, Math.floor(((db + 60) / 60) * 50)));
    const volumeBar = '█'.repeat(bars) + '░'.repeat(50 - bars);

    process.stdout.write(`\r📊 Level: [${volumeBar}] ${db.toFixed(1)} dB  `);

    updateCount++;
    if (updateCount >= 100) {
        // Run for ~10 seconds
        clearInterval(monitorInterval);
        console.log('\n\n⏹️  Stopping microphone capture...');
        micSource.stop();
        console.log('✅ Done!\n');
        process.exit(0);
    }
}, 100);
