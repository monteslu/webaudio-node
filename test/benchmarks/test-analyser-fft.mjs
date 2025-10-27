import { benchmarkAnalyserProcessOverhead } from './bench-fft-sizes.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing Analyser FFT...\n');

try {
	console.log('Testing Rust implementation...');
	const rustResults = await benchmarkAnalyserProcessOverhead(RustContext, 1);
	console.log('Rust succeeded:', Object.keys(rustResults).length, 'sizes');
} catch (e) {
	console.error('Rust ERROR:', e.message);
}

try {
	console.log('\nTesting C++ implementation...');
	const cppResults = await benchmarkAnalyserProcessOverhead(CppContext, 1);
	console.log('C++ succeeded:', Object.keys(cppResults).length, 'sizes');
} catch (e) {
	console.error('C++ ERROR:', e.message);
}

console.log('\nDone!');
