import { OfflineAudioContext } from '../../index.js';
import { benchmarkOfflineRendering } from './bench-offline-rendering.js';

console.log('Testing offline rendering benchmark with webaudio-node...\n');

const result = await benchmarkOfflineRendering(OfflineAudioContext, 10);

console.log('\nResults:');
console.log('Average time:', result.avgTimeMs.toFixed(2), 'ms');
console.log('Realtime multiplier:', result.realtimeMultiplier.toFixed(0), 'x');
console.log('Samples/sec:', (result.samplesPerSec / 1000000).toFixed(2), 'M');
