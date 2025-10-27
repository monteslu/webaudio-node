import { benchmarkSampleRates } from './bench-sample-rates.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing 44100 Hz sample rate...\\n');

const rustResults = await benchmarkSampleRates(RustContext, 10);
const cppResults = await benchmarkSampleRates(CppContext, 10);

const sampleRate = 44100;
const rustTime = rustResults[sampleRate].avgTimeMs;
const cppTime = cppResults[sampleRate].avgTimeMs;

console.log(`Rust 44100 Hz: ${rustTime.toFixed(2)}ms`);
console.log(`C++ 44100 Hz:  ${cppTime.toFixed(2)}ms`);

const diff = ((cppTime / rustTime - 1) * 100).toFixed(1);
if (cppTime < rustTime) {
	console.log(`\\n✅ WIN: ${(-diff)}% faster`);
} else {
	console.log(`\\n❌ LOSS: ${diff}% slower`);
}
