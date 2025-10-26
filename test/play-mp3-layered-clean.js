import { AudioContext } from '../src/javascript/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 Playing 5 layered instances of rising_sun.mp3...\n');

const context = new AudioContext({ sampleRate: 48000 });
const audioFilePath = join(__dirname, 'samples', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('Decoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);

console.log(`Loaded: ${buffer.duration.toFixed(2)}s, ${buffer.sampleRate}Hz, ${buffer.numberOfChannels}ch\n`);

await context.resume();

// Create master gain to prevent clipping
const masterGain = context.createGain();
masterGain.gain.value = 0.25; // 25% to handle 5 instances
masterGain.connect(context.destination);

console.log('Creating and scheduling 5 instances (0.5 second apart)...\n');

// Create 5 buffer sources, each starting 0.5 seconds apart
for (let i = 0; i < 5; i++) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain);

    const startTime = context.currentTime + (i * 0.5);
    source.start(startTime, 0, 10); // Play 10 seconds of each

    console.log(`  Instance ${i + 1}: starts at ${startTime.toFixed(2)}s`);
}

console.log('\nPlaying for 15 seconds...\n');
console.log('Listen for the layered/canon effect!\n');

await new Promise(resolve => setTimeout(resolve, 15000));

await context.close();

console.log('✅ Done!\n');
