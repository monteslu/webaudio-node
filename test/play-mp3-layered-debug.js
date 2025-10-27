import { AudioContext } from '../src/javascript/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 Playing 5 layered instances of rising_sun.mp3 (DEBUG)...\n');

const context = new AudioContext({ sampleRate: 48000 });
const audioFilePath = join(__dirname, 'samples', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('Decoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);

console.log(`Duration: ${buffer.duration.toFixed(2)} seconds`);
console.log(`Sample rate: ${buffer.sampleRate} Hz`);
console.log(`Channels: ${buffer.numberOfChannels}\n`);

console.log('Resuming context...');
await context.resume();
console.log(`Context time after resume: ${context.currentTime.toFixed(3)}s\n`);

// Create master gain to prevent clipping
const masterGain = context.createGain();
masterGain.gain.value = 0.3; // 30% volume
masterGain.connect(context.destination);

// Create analyser to monitor mixing
const analyser = context.createAnalyser();
analyser.fftSize = 2048;
masterGain.connect(analyser);

const numInstances = 5;
const sources = [];

console.log('Creating and scheduling sources:');

for (let i = 0; i < numInstances; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;

    source.connect(masterGain);

    // Schedule to start at current time + i seconds
    const startTime = context.currentTime + i;
    source.start(startTime, 0, 5); // Start at scheduled time, offset 0, play 5 seconds

    console.log(
        `  Instance ${i + 1}: scheduled to start at ${startTime.toFixed(3)}s (in ${i}s from now)`
    );

    sources.push(source);
}

// Monitor the audio levels to see when instances are playing
console.log('\nMonitoring audio levels:');

for (let t = 0; t < 10; t++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const timeData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeData);

    // Calculate RMS
    let sum = 0;
    for (let j = 0; j < timeData.length; j++) {
        sum += timeData[j] * timeData[j];
    }
    const rms = Math.sqrt(sum / timeData.length);

    console.log(
        `[${t + 1}s] Context time: ${context.currentTime.toFixed(2)}s, RMS: ${rms.toFixed(4)}`
    );
}

await context.close();

console.log('\n✅ Test complete!\n');
