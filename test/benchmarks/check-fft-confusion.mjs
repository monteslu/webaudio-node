// The "Analyser FFT Sizes" benchmark doesn't actually test FFT!
// It just renders through analyser node without calling getFloatFrequencyData()
// So it's measuring Process() overhead, not FFT performance

console.log("Understanding the FFT benchmark confusion:\n");

console.log("1. Analyser FFT Sizes benchmark (bench-fft-sizes.js):");
console.log("   - Creates analyser with different fftSize values");
console.log("   - Renders audio through analyser");
console.log("   - NEVER calls getFloatFrequencyData()");
console.log("   - Only measures Process() overhead\n");

console.log("2. Analyser benchmark (bench-analyser.js):");
console.log("   - Creates analyser with 2048 fftSize");
console.log("   - Renders audio");
console.log("   - CALLS getFloatFrequencyData() 60 times");
console.log("   - Measures actual FFT performance\n");

console.log("3. Convolver benchmark:");
console.log("   - Uses FFT internally for convolution");
console.log("   - Tests real FFT performance\n");

import { readFileSync } from 'fs';
const results = readFileSync('/tmp/full-bench-results.txt', 'utf-8');

// Find Analyser benchmark (the one that actually calls FFT)
const analyserSection = results.split('═══ Analyser (FFT with 2048 fftSize) ═══')[1];
if (analyserSection) {
	const lines = analyserSection.split('\n').slice(0, 20);
	console.log("ACTUAL FFT PERFORMANCE (Analyser with getFloatFrequencyData calls):");
	for (const line of lines) {
		if (line.includes('node-web-audio-api') || line.includes('webaudio-node')) {
			console.log(line);
		}
	}
}
