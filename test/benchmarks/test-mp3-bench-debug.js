import { AudioContext, OfflineAudioContext } from '../../index.js';
import { benchmarkMP3Processing } from './bench-mp3-processing.js';

console.log('\n🔍 Testing MP3 processing benchmark with debug output...\n');

const result = await benchmarkMP3Processing(AudioContext, OfflineAudioContext, 'test-audio.mp3', 5);

console.log('\n📊 Results:');
console.log('Average decode time:', result.avgDecodeTimeMs.toFixed(2), 'ms');
console.log('Average process time:', result.avgProcessTimeMs.toFixed(2), 'ms');
console.log('Average total time:', result.avgTotalTimeMs.toFixed(2), 'ms');
