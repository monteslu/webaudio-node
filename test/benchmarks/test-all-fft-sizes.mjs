import { benchmarkFFTSizes } from './bench-fft-sizes.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing all FFT sizes...\\n');

const rustResults = await benchmarkFFTSizes(RustContext, 10);
const cppResults = await benchmarkFFTSizes(CppContext, 10);

const fftSizes = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

let wins = 0;
let losses = 0;

for (const size of fftSizes) {
	const rustTime = rustResults[size].avgTimeMs;
	const cppTime = cppResults[size].avgTimeMs;
	const diff = ((cppTime / rustTime - 1) * 100).toFixed(1);

	if (cppTime < rustTime) {
		console.log(`FFT ${size}: ✅ WIN ${(-diff)}% faster (Rust: ${rustTime.toFixed(2)}ms, C++: ${cppTime.toFixed(2)}ms)`);
		wins++;
	} else {
		console.log(`FFT ${size}: ❌ LOSS ${diff}% slower (Rust: ${rustTime.toFixed(2)}ms, C++: ${cppTime.toFixed(2)}ms)`);
		losses++;
	}
}

console.log(`\\nTotal: ${wins}/${fftSizes.length} wins`);
