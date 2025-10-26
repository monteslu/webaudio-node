import { AudioContext } from '../src/javascript/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🎵 Playing first 5 seconds of test/samples/rising_sun.mp3...\n');

const context = new AudioContext({ sampleRate: 48000 });
const audioFilePath = join(__dirname, 'samples', 'rising_sun.mp3');
const audioData = readFileSync(audioFilePath);

console.log('Decoding audio file...');
const buffer = await context.decodeAudioData(audioData.buffer);

console.log(`Duration: ${buffer.duration.toFixed(2)} seconds`);
console.log(`Sample rate: ${buffer.sampleRate} Hz`);
console.log(`Channels: ${buffer.numberOfChannels}`);
console.log('\nPlaying first 5 seconds...\n');

const source = context.createBufferSource();
source.buffer = buffer;

// Add a gain node for smooth playback
const gain = context.createGain();
source.connect(gain);
gain.connect(context.destination);

await context.resume();
source.start(0, 0, 5); // Start at 0, offset 0, duration 5 seconds

// Wait for 5 seconds of playback
await new Promise(resolve => setTimeout(resolve, 5100));

await context.close();

console.log('✅ Playback complete!\n');
