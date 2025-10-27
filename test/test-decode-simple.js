import { AudioContext } from './src/javascript/index.js';
import { readFileSync } from 'fs';

console.log('\n🧪 Testing decodeAudioData...\n');

const ctx = new AudioContext({ sampleRate: 48000 });
const mp3Data = readFileSync('test/samples/rising_sun.mp3');

console.log('MP3 file size:', mp3Data.length, 'bytes');

try {
    console.log('Calling decodeAudioData...');
    const buffer = await ctx.decodeAudioData(mp3Data.buffer);

    console.log('\n✅ Decode succeeded!');
    console.log('Channels:', buffer.numberOfChannels);
    console.log('Length:', buffer.length);
    console.log('Duration:', buffer.duration, 'seconds');
    console.log('Sample rate:', buffer.sampleRate, 'Hz');

    // Check channel data
    const ch0 = buffer.getChannelData(0);
    console.log('\nChannel 0 length:', ch0.length);
    console.log('First 10 samples:', ch0.slice(0, 10));

    // Check for non-zero samples
    let max = 0;
    let nonZeroCount = 0;
    for (let i = 0; i < ch0.length; i++) {
        if (Math.abs(ch0[i]) > 0.0001) {
            nonZeroCount++;
        }
        max = Math.max(max, Math.abs(ch0[i]));
    }

    console.log('Max amplitude:', max);
    console.log('Non-zero samples:', nonZeroCount, '/', ch0.length);
    console.log('\n' + (max > 0.0001 ? '✅ HAS AUDIO' : '❌ SILENT!'));

} catch (error) {
    console.error('\n❌ Decode failed:', error.message);
    console.error(error.stack);
}

await ctx.close();
