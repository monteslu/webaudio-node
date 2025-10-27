import { AudioContext } from '../src/javascript/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 Playing test/samples/rising_sun.mp3 with debug output...\n');

const context = new AudioContext({ sampleRate: 48000 });
console.log('AudioContext created:', context.state);
console.log('Sample rate:', context.sampleRate);

const audioFilePath = join(__dirname, 'samples', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('\nDecoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);

console.log(`Duration: ${buffer.duration.toFixed(2)} seconds`);
console.log(`Sample rate: ${buffer.sampleRate} Hz`);
console.log(`Channels: ${buffer.numberOfChannels}`);
console.log(`Length: ${buffer.length} samples`);

// Create nodes
const source = context.createBufferSource();
source.buffer = buffer;

// Add gain for volume control
const gain = context.createGain();
gain.gain.value = 0.5; // 50% volume

// Add analyser to check if audio is flowing
const analyser = context.createAnalyser();
analyser.fftSize = 2048;

// Connect: source -> gain -> analyser -> destination
source.connect(gain);
gain.connect(analyser);
analyser.connect(context.destination);

console.log('\nAudio graph connected');
console.log('Source -> Gain -> Analyser -> Destination');

console.log('\nResuming audio context...');
await context.resume();
console.log('Context state:', context.state);

console.log('\nStarting playback (5 seconds)...');
source.start(0, 0, 5); // Start at 0, offset 0, duration 5 seconds

// Check audio levels while playing
for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const timeData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeData);

    // Calculate RMS
    let sum = 0;
    for (let j = 0; j < timeData.length; j++) {
        sum += timeData[j] * timeData[j];
    }
    const rms = Math.sqrt(sum / timeData.length);

    console.log(
        `[${(i * 0.5).toFixed(1)}s] RMS level: ${rms.toFixed(4)}, Time: ${context.currentTime.toFixed(2)}s`
    );
}

console.log('\nClosing context...');
await context.close();

console.log('✅ Test complete!\n');
