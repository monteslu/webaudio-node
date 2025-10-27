import { AudioContext } from '../src/javascript/index.js';

console.log('🎙️  Voice Effects Example\n');
console.log('This example captures your voice and applies real-time effects\n');

const ctx = new AudioContext({ sampleRate: 48000, channels: 2 });

// List available input devices
const devices = await ctx.getInputDevices();
if (devices.length === 0) {
    console.log('❌ No input devices found!');
    process.exit(1);
}

console.log('📋 Available microphones:');
devices.forEach(device => {
    console.log(`   [${device.id}] ${device.name}`);
});
console.log('');

// Create audio graph
const micSource = ctx.createMediaStreamSource({ deviceIndex: 0 });

// Create effects chain
const preGain = ctx.createGain();
preGain.gain.value = 2.0;  // Boost input

// Low-cut filter (remove rumble)
const lowCut = ctx.createBiquadFilter();
lowCut.type = 'highpass';
lowCut.frequency.value = 80;

// Presence boost (enhance clarity)
const presence = ctx.createBiquadFilter();
presence.type = 'peaking';
presence.frequency.value = 3000;
presence.Q.value = 1.0;
presence.gain.value = 3.0;  // +3dB boost

// Compressor (even out volume)
const compressor = ctx.createDynamicsCompressor();
compressor.threshold.value = -24;
compressor.knee.value = 12;
compressor.ratio.value = 4;
compressor.attack.value = 0.003;
compressor.release.value = 0.25;

// Output gain
const outputGain = ctx.createGain();
outputGain.gain.value = 0.8;

// Connect the chain
micSource.connect(preGain);
preGain.connect(lowCut);
lowCut.connect(presence);
presence.connect(compressor);
compressor.connect(outputGain);
outputGain.connect(ctx.destination);

console.log('🎛️  Effect chain:');
console.log('   Microphone → Pre-Gain (2x)');
console.log('   → High-Pass Filter (80 Hz)');
console.log('   → Presence Boost (3 kHz, +3 dB)');
console.log('   → Compressor (4:1 ratio)');
console.log('   → Output Gain (0.8x)');
console.log('   → Speakers\n');

// Start capture
const started = await micSource.start();
if (!started) {
    console.log('❌ Failed to start capture');
    process.exit(1);
}

await ctx.resume();

console.log('✅ Voice effects are active!');
console.log('   Speak into your microphone to hear the processed audio.');
console.log('   Running for 10 seconds...\n');

// Monitor levels
const analyser = ctx.createAnalyser();
analyser.fftSize = 2048;
compressor.connect(analyser);

const dataArray = new Float32Array(analyser.fftSize);

const monitorInterval = setInterval(() => {
    analyser.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const db = 20 * Math.log10(rms);

    const bars = Math.max(0, Math.min(50, Math.floor((db + 60) / 60 * 50)));
    const volumeBar = '█'.repeat(bars) + '░'.repeat(50 - bars);

    process.stdout.write(`\r🔊 Output: [${volumeBar}] ${db.toFixed(1)} dB  `);
}, 100);

setTimeout(() => {
    clearInterval(monitorInterval);
    console.log('\n\n⏹️  Stopping...');
    micSource.stop();
    console.log('✅ Done!\n');
    process.exit(0);
}, 10000);
