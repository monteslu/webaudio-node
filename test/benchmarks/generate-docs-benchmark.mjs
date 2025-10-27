#!/usr/bin/env node
// Generate automated benchmark documentation for docs/

import fs from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

console.log('🚀 Running benchmarks to generate documentation...\n');

// Run benchmarks and capture output
const benchmarkOutput = execSync('node test/benchmarks/run-benchmarks.js', {
	cwd: rootDir,
	encoding: 'utf-8',
	maxBuffer: 10 * 1024 * 1024, // 10MB buffer
	stdio: ['pipe', 'pipe', 'pipe']
});

console.log('✓ Benchmarks complete\n');
console.log('📊 Analyzing results...\n');

// Parse benchmark results
const results = [];
const lines = benchmarkOutput.split('\n');
let currentBenchmark = null;
let rustResults = {};
let wasmResults = {};

// Strip ANSI codes for easier parsing
function stripAnsi(str) {
	return str.replace(/\x1b\[[0-9;]*m/g, '');
}

for (let i = 0; i < lines.length; i++) {
	const line = stripAnsi(lines[i]);

	// Detect benchmark sections (lines with ═══ borders)
	if (line.includes('═══') && !line.includes('SUMMARY') && !line.includes('Testing')) {
		const match = line.match(/═══\s+(.+?)\s+═══/);
		if (match) {
			const benchmarkName = match[1].trim();
			// Skip Memory Usage benchmark - it measures memory, not time
			if (!benchmarkName.includes('Memory Usage')) {
				currentBenchmark = benchmarkName;
			} else {
				currentBenchmark = null;
			}
		}
	}

	// Parse table rows with results - look for implementation names in first column
	const implMatch = line.match(/│\s*(node-web-audio-api|webaudio-node)\s*│/);
	if (implMatch && currentBenchmark) {
		const impl = implMatch[1];

		// Extract all numeric values from the row
		const numbers = [];
		const parts = line.split('│');
		for (const part of parts) {
			const numMatch = part.match(/(\d+\.?\d*)/);
			if (numMatch) {
				numbers.push(parseFloat(numMatch[1]));
			}
		}

		// First meaningful number is usually the main time/performance metric
		if (numbers.length >= 1) {
			const mainMetric = numbers[0]; // First number after impl name
			const secondMetric = numbers[1] || 0; // Could be realtime multiplier or other metric

			const key = currentBenchmark;
			if (impl === 'node-web-audio-api') {
				rustResults[key] = { avgTime: mainMetric, realtimeMultiplier: secondMetric };
			} else if (impl === 'webaudio-node') {
				wasmResults[key] = { avgTime: mainMetric, realtimeMultiplier: secondMetric };
			}

			// If we have both results, record the comparison
			if (rustResults[key] && wasmResults[key]) {
				const faster = wasmResults[key].avgTime < rustResults[key].avgTime ? 'webaudio-node' : 'node-web-audio-api';
				const speedup = faster === 'webaudio-node'
					? ((rustResults[key].avgTime / wasmResults[key].avgTime - 1) * 100)
					: ((wasmResults[key].avgTime / rustResults[key].avgTime - 1) * 100);

				results.push({
					benchmark: key,
					rustTime: rustResults[key].avgTime,
					rustMultiplier: rustResults[key].realtimeMultiplier,
					wasmTime: wasmResults[key].avgTime,
					wasmMultiplier: wasmResults[key].realtimeMultiplier,
					faster,
					speedup: Math.abs(speedup)
				});

				// Clear for next benchmark
				delete rustResults[key];
				delete wasmResults[key];
			}
		}
	}
}

console.log(`✓ Parsed ${results.length} benchmark comparisons\n`);

// Calculate statistics
const similar = results.filter(r => r.speedup <= 1.0).length;
const wasmWins = results.filter(r => r.speedup > 1.0 && r.faster === 'webaudio-node').length;
const rustWins = results.filter(r => r.speedup > 1.0 && r.faster === 'node-web-audio-api').length;
const avgSpeedup = results
	.filter(r => r.speedup > 1.0 && r.faster === 'webaudio-node')
	.reduce((sum, r) => sum + r.speedup, 0) / (wasmWins || 1);

// Get system info
const systemInfo = {
	platform: os.platform(),
	arch: os.arch(),
	cpus: os.cpus()[0]?.model || 'Unknown',
	nodeVersion: process.version,
	date: new Date().toISOString().split('T')[0]
};

// Generate markdown
let markdown = `# Automated Benchmark Results

> **Last Updated:** ${systemInfo.date}
> **Platform:** ${systemInfo.platform} (${systemInfo.arch})
> **CPU:** ${systemInfo.cpus}
> **Node.js:** ${systemInfo.nodeVersion}

## Overview

Comparative performance benchmarks between **webaudio-node** (WASM + C++ implementation) and **node-web-audio-api** (pure Rust implementation).

### Summary Statistics

- **Total Benchmarks:** ${results.length}
- **webaudio-node Wins:** ${wasmWins} (${(wasmWins / results.length * 100).toFixed(1)}%)
- **node-web-audio-api Wins:** ${rustWins} (${(rustWins / results.length * 100).toFixed(1)}%)
- **Similar Performance (within 1%):** ${similar} (${(similar / results.length * 100).toFixed(1)}%)
- **Average Speedup (when faster):** ${avgSpeedup.toFixed(1)}%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
`;

// Sort by speedup (largest wins first, similar performance at end)
results.sort((a, b) => {
	const aSimilar = a.speedup <= 1.0;
	const bSimilar = b.speedup <= 1.0;
	const aWasm = a.faster === 'webaudio-node';
	const bWasm = b.faster === 'webaudio-node';

	// Similar performance goes last
	if (aSimilar && !bSimilar) return 1;
	if (!aSimilar && bSimilar) return -1;
	if (aSimilar && bSimilar) return 0;

	// WASM wins before Rust wins
	if (aWasm && !bWasm) return -1;
	if (!aWasm && bWasm) return 1;

	// Within same category, sort by speedup
	return b.speedup - a.speedup;
});

for (const result of results) {
	// Within 1% is considered similar performance
	let fasterIcon, fasterLabel;
	if (result.speedup <= 1.0) {
		fasterIcon = '🟡';
		fasterLabel = 'Similar';
	} else if (result.faster === 'webaudio-node') {
		fasterIcon = '🟢';
		fasterLabel = 'WASM';
	} else {
		fasterIcon = '🔴';
		fasterLabel = 'Rust';
	}

	const rtMultiplier = `${result.wasmMultiplier.toFixed(1)}x / ${result.rustMultiplier.toFixed(1)}x`;

	markdown += `| ${result.benchmark} | ${result.wasmTime.toFixed(2)} | ${result.rustTime.toFixed(2)} | ${rtMultiplier} | ${fasterIcon} ${fasterLabel} | ${result.speedup.toFixed(1)}% |\n`;
}

markdown += `
## Interpretation

- **Render Time (ms):** Time taken to render 1 second of audio. Lower is better.
- **Realtime Multiplier:** How many times faster than realtime the rendering is. Higher is better.
  - Example: 100x means it can render 100 seconds of audio in 1 second
- **🟢 WASM:** webaudio-node is faster for this benchmark
- **🔴 Rust:** node-web-audio-api is faster for this benchmark
- **🟡 Similar:** Performance difference is within 1% (essentially equivalent)

## Notes

These benchmarks measure offline rendering performance, which is different from realtime audio playback. Results may vary based on:
- Hardware (CPU, memory)
- Operating system
- Node.js version
- System load during testing

Both implementations are capable of realtime audio processing as indicated by realtime multipliers significantly greater than 1.0x.
`;

// Write to docs directory
const docsPath = path.join(rootDir, 'docs', 'automated_benchmarks.md');
fs.mkdirSync(path.dirname(docsPath), { recursive: true });
fs.writeFileSync(docsPath, markdown);

console.log('✓ Generated docs/automated_benchmarks.md\n');
console.log(`📈 Results Summary:`);
console.log(`   - webaudio-node wins: ${wasmWins}/${results.length} (${(wasmWins / results.length * 100).toFixed(1)}%)`);
console.log(`   - node-web-audio-api wins: ${rustWins}/${results.length} (${(rustWins / results.length * 100).toFixed(1)}%)`);
console.log(`   - Similar performance (within 1%): ${similar}/${results.length} (${(similar / results.length * 100).toFixed(1)}%)`);
console.log(`   - Average speedup when faster: ${avgSpeedup.toFixed(1)}%\n`);
console.log('✅ Done!\n');
