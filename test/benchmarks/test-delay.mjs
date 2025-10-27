import { benchmarkDelay } from './bench-delay.js';
import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';

const implementations = [
	{ name: 'node-web-audio-api', OfflineAudioContext: RustContext },
	{ name: 'webaudio-node', OfflineAudioContext: CppContext }
];

console.log('Testing Delay Node Performance (3 iterations)...\n');

for (const impl of implementations) {
	const result = await benchmarkDelay(impl.OfflineAudioContext, 3);
	console.log(`${impl.name}: ${result.avgTimeMs.toFixed(2)}ms (${result.realtimeMultiplier.toFixed(1)}x realtime)`);
}

console.log('\nDone!');
