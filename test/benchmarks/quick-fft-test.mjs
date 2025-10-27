import { benchmarkFFTSizes } from './bench-fft-sizes.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing FFT Size 2048 (no getFloatFrequencyData calls)...\\n');

const rustResults = await benchmarkFFTSizes(RustContext, 10);
const cppResults = await benchmarkFFTSizes(CppContext, 10);

const fftSize = 2048;
const rustTime = rustResults[fftSize].avgTimeMs;
const cppTime = cppResults[fftSize].avgTimeMs;

console.log(`Rust: ${rustTime.toFixed(2)}ms`);
console.log(`C++:  ${cppTime.toFixed(2)}ms`);

const diff = ((cppTime / rustTime - 1) * 100).toFixed(1);
if (cppTime < rustTime) {
	console.log(`\\n✅ WIN: ${(-diff)}% faster`);
} else {
	console.log(`\\n❌ LOSS: ${diff}% slower`);
}
