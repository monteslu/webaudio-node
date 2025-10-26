import { decodeAudioFile } from './src/javascript/index.js';

const buf = await decodeAudioFile('test/samples/rising_sun.mp3', 48000);
console.log('Channels:', buf.numberOfChannels);
console.log('Length:', buf.length);
console.log('Duration:', buf.duration, 'seconds');

const data = buf.getChannelData(0);
let max = 0;
for (let i = 0; i < data.length; i++) {
	max = Math.max(max, Math.abs(data[i]));
}
console.log('Max amplitude:', max);
console.log('Has audio:', max > 0.0001 ? 'YES' : 'NO (SILENT!)');
