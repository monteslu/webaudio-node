import { AudioContext, OfflineAudioContext } from './src/javascript/index.js';
import { readFileSync } from 'fs';

console.log('\n🧪 Testing MP3 decode + offline processing...\n');

// Decode MP3
const ctx = new AudioContext({ sampleRate: 48000 });
const mp3Data = readFileSync('test/samples/rising_sun.mp3');

console.log('1. Decoding MP3...');
if (ctx.resume) await ctx.resume();
const audioBuffer = await ctx.decodeAudioData(mp3Data.buffer);
// if (ctx.close) await ctx.close();  // Don't close - maybe it destroys the buffer?

console.log('   ✅ Decoded:', audioBuffer.duration.toFixed(2), 'seconds');

// Check decoded audio has data
const decodedData = audioBuffer.getChannelData(0);
let maxDecoded = 0;
for (let i = 0; i < Math.min(1000, decodedData.length); i++) {
	maxDecoded = Math.max(maxDecoded, Math.abs(decodedData[i]));
}
console.log('   Max amplitude in channel data:', maxDecoded);

// Check interleaved buffer
const interleavedData = audioBuffer._getInterleavedData();
console.log('   Interleaved buffer length:', interleavedData.length, 'bytes');
console.log('   First 20 bytes:', interleavedData.slice(0, 20));
let maxInterleaved = 0;
for (let i = 0; i < Math.min(1000 * 2 * 4, interleavedData.length); i += 4) {
	const val = Math.abs(interleavedData.readFloatLE(i));
	maxInterleaved = Math.max(maxInterleaved, val);
}
console.log('   Max amplitude in interleaved buffer:', maxInterleaved);

// Process offline
console.log('\n2. Creating offline context for processing...');
const offlineCtx = new OfflineAudioContext({
	numberOfChannels: audioBuffer.numberOfChannels,
	length: audioBuffer.length,
	sampleRate: audioBuffer.sampleRate
});

console.log('3. Creating processing chain...');
const source = offlineCtx.createBufferSource();
source.buffer = audioBuffer;

const lowShelf = offlineCtx.createBiquadFilter();
lowShelf.type = 'lowshelf';
lowShelf.frequency.value = 200;
lowShelf.gain.value = 3;

const highShelf = offlineCtx.createBiquadFilter();
highShelf.type = 'highshelf';
highShelf.frequency.value = 3000;
highShelf.gain.value = 2;

const compressor = offlineCtx.createDynamicsCompressor();
compressor.threshold.value = -24;
compressor.knee.value = 30;
compressor.ratio.value = 12;
compressor.attack.value = 0.003;
compressor.release.value = 0.25;

const gain = offlineCtx.createGain();
gain.gain.value = 0.8;

source.connect(lowShelf);
lowShelf.connect(highShelf);
highShelf.connect(compressor);
compressor.connect(gain);
gain.connect(offlineCtx.destination);

source.start(0);

console.log('4. Rendering...');
const processedBuffer = await offlineCtx.startRendering();

console.log('   ✅ Rendered:', processedBuffer.length, 'samples');

// Check processed audio
const processedData = processedBuffer.getChannelData(0);
console.log('\nFirst 10 samples:', processedData.slice(0, 10));

let maxProcessed = 0;
let nonZeroCount = 0;
for (let i = 0; i < processedData.length; i++) {
	if (Math.abs(processedData[i]) > 0.0001) {
		nonZeroCount++;
	}
	maxProcessed = Math.max(maxProcessed, Math.abs(processedData[i]));
}

console.log('Max amplitude:', maxProcessed);
console.log('Non-zero samples:', nonZeroCount, '/', processedData.length);
console.log('\n' + (maxProcessed > 0.0001 ? '✅ HAS AUDIO' : '❌ SILENT!'));
