import { benchmarkSampleRates } from './bench-sample-rates.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing Sample Rates (3 iterations)...\n');

const rustResults = await benchmarkSampleRates(RustContext, 3);
const cppResults = await benchmarkSampleRates(CppContext, 3);

console.log('\nComparison:');
console.log('Rate   | Rust (ms) | C++ (ms) | Difference');
console.log('-------|-----------|----------|------------');

for (const rate of [44100, 48000]) {
	const rustTime = rustResults[rate].avgTimeMs;
	const cppTime = cppResults[rate].avgTimeMs;
	const diff = ((cppTime / rustTime - 1) * 100).toFixed(1);
	const symbol = cppTime < rustTime ? '✅' : '❌';
	console.log(`${rate} | ${rustTime.toFixed(2)}      | ${cppTime.toFixed(2)}      | ${symbol} ${diff}%`);
}

console.log('\nDone!');
