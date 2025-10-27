import { benchmarkChannelCounts } from './bench-channel-counts.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing channel count performance...\n');

const rustResults = await benchmarkChannelCounts(RustContext, 10);
const cppResults = await benchmarkChannelCounts(CppContext, 10);

const channels = [1, 2, 4, 6, 8];

let wins = 0;
let losses = 0;

for (const ch of channels) {
	const rustTime = rustResults[ch].avgTimeMs;
	const cppTime = cppResults[ch].avgTimeMs;
	const diff = ((cppTime / rustTime - 1) * 100).toFixed(1);

	if (cppTime < rustTime) {
		console.log(`${ch}ch: ✅ WIN ${(-diff)}% faster (Rust: ${rustTime.toFixed(2)}ms, C++: ${cppTime.toFixed(2)}ms)`);
		wins++;
	} else {
		console.log(`${ch}ch: ❌ LOSS ${diff}% slower (Rust: ${rustTime.toFixed(2)}ms, C++: ${cppTime.toFixed(2)}ms)`);
		losses++;
	}
}

console.log(`\nTotal: ${wins}/${channels.length} wins`);
