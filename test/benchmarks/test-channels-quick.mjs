import { benchmarkChannelCounts } from './bench-channel-counts.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing Channel Counts Performance (3 iterations)...\n');

const rustResults = await benchmarkChannelCounts(RustContext, 3);
const cppResults = await benchmarkChannelCounts(CppContext, 3);

console.log('\nComparison:');
console.log('Channels | Rust (ms) | C++ (ms) | Difference');
console.log('---------|-----------|----------|------------');

for (const ch of [1, 2, 4, 6, 8]) {
	const rustTime = rustResults[ch].avgTimeMs;
	const cppTime = cppResults[ch].avgTimeMs;
	const diff = ((cppTime / rustTime - 1) * 100).toFixed(1);
	const symbol = cppTime < rustTime ? '✅' : '❌';
	console.log(`${ch}ch      | ${rustTime.toFixed(2)}      | ${cppTime.toFixed(2)}      | ${symbol} ${diff}%`);
}

console.log('\nDone!');
