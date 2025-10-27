import { benchmarkOversampling } from './bench-oversampling.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

console.log('Testing WaveShaper "none" oversampling (3 runs)...\n');

for (let run = 1; run <= 3; run++) {
	console.log(`=== Run ${run} ===`);

	const rustResults = await benchmarkOversampling(RustContext, 3);
	const cppResults = await benchmarkOversampling(CppContext, 3);

	const rustTime = rustResults['none'].avgTimeMs;
	const cppTime = cppResults['none'].avgTimeMs;
	const diff = ((cppTime - rustTime) / rustTime * 100).toFixed(1);
	const symbol = cppTime < rustTime ? '✅' : '❌';

	console.log(`Rust: ${rustTime.toFixed(2)}ms | C++: ${cppTime.toFixed(2)}ms | ${symbol} ${diff}%\n`);
}
