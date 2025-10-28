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
console.log('[DEBUG] Starting execSync of run-benchmarks.js at', new Date().toISOString());

// Run benchmarks and capture output
const startTime = Date.now();
const benchmarkOutput = execSync('node test/benchmarks/run-benchmarks.js', {
	cwd: rootDir,
	encoding: 'utf-8',
	maxBuffer: 10 * 1024 * 1024, // 10MB buffer
	stdio: ['pipe', 'pipe', 'ignore']  // Ignore stderr to avoid blocking
});
const execDuration = Date.now() - startTime;

console.log(`[DEBUG] execSync completed in ${execDuration}ms`);
console.log('✓ Benchmarks complete\n');
console.log('[DEBUG] Starting result parsing at', new Date().toISOString());
console.log('📊 Analyzing results...\n');

// Parse benchmark results
const results = [];
const lines = benchmarkOutput.split('\n');
let currentBenchmark = null;
let parentBenchmark = null; // Track parent benchmark for sub-sections
let rustResults = {};
let wasmResults = {};

// Strip ANSI codes for easier parsing
function stripAnsi(str) {
	return str.replace(/\x1b\[[0-9;]*m/g, '');
}

for (let i = 0; i < lines.length; i++) {
	const line = stripAnsi(lines[i]);

	// Detect main benchmark sections (lines with ═══ borders)
	if (line.includes('═══') && !line.includes('SUMMARY') && !line.includes('Summary') && !line.includes('Testing')) {
		const match = line.match(/═══\s+(.+?)\s+═══/);
		if (match) {
			const benchmarkName = match[1].trim();
			// Skip Memory Usage benchmark - it measures memory, not time
			if (!benchmarkName.includes('Memory Usage')) {
				// Check if this is a parent benchmark with sub-sections
				// Common patterns: "Sample Rates", "Channel Counts", "Distance Models", etc.
				if (benchmarkName.includes('Sample Rates') ||
				    benchmarkName.includes('Channel Counts') ||
				    benchmarkName.includes('Distance Models') ||
				    benchmarkName.includes('Oversampling Levels') ||
				    benchmarkName.includes('FFT Sizes') ||
				    benchmarkName.includes('Impulse Response Sizes')) {
					parentBenchmark = benchmarkName;
					currentBenchmark = null; // Wait for sub-section
				} else {
					currentBenchmark = benchmarkName;
					parentBenchmark = null;
				}
			} else {
				currentBenchmark = null;
				parentBenchmark = null;
			}
		}
	}

	// Detect sub-section headings (bold text followed by colon, like "8000 Hz:", "Linear:", "none:")
	// These appear after a parent benchmark heading
	if (parentBenchmark && line.match(/^[^│┌└├─]+:$/)) {
		const subSection = line.replace(/:/g, '').trim();
		currentBenchmark = `${parentBenchmark} (${subSection})`;
	}

	// Parse table rows with results - look for implementation names in first column
	const implMatch = line.match(/│\s*(node-web-audio-api|webaudio-node)\s*│/);
	if (implMatch && currentBenchmark) {
		const impl = implMatch[1];

		// Check if this row contains "FAILED"
		const hasFailed = line.includes('FAILED');

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
		if (hasFailed || numbers.length >= 1) {
			const mainMetric = hasFailed ? null : numbers[0]; // First number after impl name
			const secondMetric = hasFailed ? null : (numbers[1] || 0); // Could be realtime multiplier or other metric

			const key = currentBenchmark;
			if (impl === 'node-web-audio-api') {
				rustResults[key] = { avgTime: mainMetric, realtimeMultiplier: secondMetric };
			} else if (impl === 'webaudio-node') {
				wasmResults[key] = { avgTime: mainMetric, realtimeMultiplier: secondMetric };
			}

			// NEVER HIDE FAILING TESTS - we need to know what's broken!
			// If we have both results, record the comparison
			if (rustResults[key] && wasmResults[key]) {
				// Check if either implementation failed
				const rustFailed = rustResults[key].avgTime === null;
				const wasmFailed = wasmResults[key].avgTime === null;

				if (rustFailed || wasmFailed) {
					// One or both failed
					results.push({
						benchmark: key,
						rustTime: rustResults[key].avgTime,
						rustMultiplier: rustResults[key].realtimeMultiplier,
						wasmTime: wasmResults[key].avgTime,
						wasmMultiplier: wasmResults[key].realtimeMultiplier,
						faster: rustFailed ? 'node-web-audio-api' : 'webaudio-node',
						speedup: null,
						failed: rustFailed && wasmFailed ? 'both' : (rustFailed ? 'node-web-audio-api' : 'webaudio-node')
					});
				} else {
					// Both succeeded
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
				}

				// Clear for next benchmark
				delete rustResults[key];
				delete wasmResults[key];
			}
		}
	}
}

// NEVER HIDE FAILING TESTS - Add any benchmarks that only completed for one implementation
for (const [key, value] of Object.entries(rustResults)) {
	results.push({
		benchmark: key,
		rustTime: value.avgTime,
		rustMultiplier: value.realtimeMultiplier,
		wasmTime: null,
		wasmMultiplier: null,
		faster: 'node-web-audio-api',
		speedup: null,
		failed: 'webaudio-node'
	});
}

for (const [key, value] of Object.entries(wasmResults)) {
	results.push({
		benchmark: key,
		rustTime: null,
		rustMultiplier: null,
		wasmTime: value.avgTime,
		wasmMultiplier: value.realtimeMultiplier,
		faster: 'webaudio-node',
		speedup: null,
		failed: 'node-web-audio-api'
	});
}

console.log(`[DEBUG] Parsing completed in ${Date.now() - startTime - execDuration}ms`);
console.log(`✓ Parsed ${results.length} benchmark comparisons\n`);

console.log('[DEBUG] Starting statistics calculation');
// Calculate statistics
const similar = results.filter(r => r.speedup !== null && r.speedup <= 1.0).length;
const wasmWins = results.filter(r => r.speedup !== null && r.speedup > 1.0 && r.faster === 'webaudio-node').length;
const rustWins = results.filter(r => r.speedup !== null && r.speedup > 1.0 && r.faster === 'node-web-audio-api').length;
const wasmFailed = results.filter(r => r.failed === 'webaudio-node').length;
const rustFailed = results.filter(r => r.failed === 'node-web-audio-api').length;
const bothFailed = results.filter(r => r.failed === 'both').length;

// Calculate successful comparisons (both implementations completed)
const successfulComparisons = wasmWins + rustWins + similar;
const totalBenchmarks = results.length;

const avgSpeedup = results
	.filter(r => r.speedup !== null && r.speedup > 1.0 && r.faster === 'webaudio-node')
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

- **Total Benchmarks:** ${totalBenchmarks}
- **Successful Comparisons:** ${successfulComparisons} (both implementations completed)
  - **webaudio-node wins:** ${wasmWins}/${successfulComparisons} (**${(wasmWins / successfulComparisons * 100).toFixed(1)}%**)
  - **node-web-audio-api wins:** ${rustWins}/${successfulComparisons} (${(rustWins / successfulComparisons * 100).toFixed(1)}%)
  - **Similar performance (within 1%):** ${similar}/${successfulComparisons} (${(similar / successfulComparisons * 100).toFixed(1)}%)
- **Failed Benchmarks:** ${wasmFailed + rustFailed + bothFailed}
  - **webaudio-node failed:** ${wasmFailed}
  - **node-web-audio-api failed:** ${rustFailed}
  - **Both failed:** ${bothFailed}
- **Average Speedup (when webaudio-node faster):** ${avgSpeedup.toFixed(1)}%

## Detailed Results

The table below shows render time in milliseconds (lower is better) and realtime multiplier (higher is better) for each benchmark.

| Benchmark | webaudio-node<br/>(ms) | node-web-audio-api<br/>(ms) | Realtime Multiplier<br/>(WASM / Rust) | Faster | Speedup |
|-----------|----------:|------------:|----------------:|---------|--------:|
`;

// Sort by speedup (largest wins first, failures at end)
results.sort((a, b) => {
	const aFailed = a.speedup === null;
	const bFailed = b.speedup === null;
	const aSimilar = a.speedup !== null && a.speedup <= 1.0;
	const bSimilar = b.speedup !== null && b.speedup <= 1.0;
	const aWasm = a.faster === 'webaudio-node';
	const bWasm = b.faster === 'webaudio-node';

	// Failures go at the very end
	if (aFailed && !bFailed) return 1;
	if (!aFailed && bFailed) return -1;
	if (aFailed && bFailed) return 0;

	// Similar performance goes before failures
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
	let fasterIcon, fasterLabel;
	let wasmTimeStr, rustTimeStr, rtMultiplier, speedupStr;

	if (result.failed) {
		// One or both implementations failed
		if (result.failed === 'both') {
			fasterIcon = '❌';
			fasterLabel = 'BOTH FAILED';
		} else {
			fasterIcon = '❌';
			fasterLabel = `${result.failed} FAILED`;
		}
		wasmTimeStr = result.wasmTime !== null ? result.wasmTime.toFixed(2) : 'FAILED';
		rustTimeStr = result.rustTime !== null ? result.rustTime.toFixed(2) : 'FAILED';

		// Handle realtime multipliers carefully - they can be null for failed tests
		if (result.wasmMultiplier !== null && result.rustMultiplier !== null) {
			rtMultiplier = `${result.wasmMultiplier.toFixed(1)}x / ${result.rustMultiplier.toFixed(1)}x`;
		} else if (result.wasmMultiplier !== null) {
			rtMultiplier = `${result.wasmMultiplier.toFixed(1)}x / N/A`;
		} else if (result.rustMultiplier !== null) {
			rtMultiplier = `N/A / ${result.rustMultiplier.toFixed(1)}x`;
		} else {
			rtMultiplier = 'N/A / N/A';
		}
		speedupStr = 'N/A';
	} else {
		// Both implementations completed
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
		wasmTimeStr = result.wasmTime.toFixed(2);
		rustTimeStr = result.rustTime.toFixed(2);
		rtMultiplier = `${result.wasmMultiplier.toFixed(1)}x / ${result.rustMultiplier.toFixed(1)}x`;
		speedupStr = `${result.speedup.toFixed(1)}%`;
	}

	markdown += `| ${result.benchmark} | ${wasmTimeStr} | ${rustTimeStr} | ${rtMultiplier} | ${fasterIcon} ${fasterLabel} | ${speedupStr} |\n`;
}

markdown += `
## Interpretation

- **Render Time (ms):** Time taken to render 1 second of audio. Lower is better.
- **Realtime Multiplier:** How many times faster than realtime the rendering is. Higher is better.
  - Example: 100x means it can render 100 seconds of audio in 1 second
- **🟢 WASM:** webaudio-node is faster for this benchmark
- **🔴 Rust:** node-web-audio-api is faster for this benchmark
- **🟡 Similar:** Performance difference is within 1% (essentially equivalent)
- **❌ FAILED:** One implementation failed to complete the benchmark

## Notes

These benchmarks measure offline rendering performance, which is different from realtime audio playback. Results may vary based on:
- Hardware (CPU, memory)
- Operating system
- Node.js version
- System load during testing

Both implementations are capable of realtime audio processing as indicated by realtime multipliers significantly greater than 1.0x.
`;

// Write to docs directory
console.log('[DEBUG] Starting markdown generation and file write');
const docsPath = path.join(rootDir, 'docs', 'automated_benchmarks.md');
fs.mkdirSync(path.dirname(docsPath), { recursive: true });
fs.writeFileSync(docsPath, markdown);

console.log(`[DEBUG] Total time: ${Date.now() - startTime}ms`);
console.log('✓ Generated docs/automated_benchmarks.md\n');
console.log(`📈 Results Summary:`);
console.log(`   - Total benchmarks: ${totalBenchmarks}`);
console.log(`   - Successful comparisons: ${successfulComparisons}`);
console.log(`   - webaudio-node wins: ${wasmWins}/${successfulComparisons} (${(wasmWins / successfulComparisons * 100).toFixed(1)}%)`);
console.log(`   - node-web-audio-api wins: ${rustWins}/${successfulComparisons} (${(rustWins / successfulComparisons * 100).toFixed(1)}%)`);
console.log(`   - Similar performance: ${similar}/${successfulComparisons} (${(similar / successfulComparisons * 100).toFixed(1)}%)`);
console.log(`   - Average speedup when faster: ${avgSpeedup.toFixed(1)}%\n`);
console.log('✅ Done!\n');
