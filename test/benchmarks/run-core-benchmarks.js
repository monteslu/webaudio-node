import { benchmarkOfflineRendering } from './bench-offline-rendering.js';
import { benchmarkMixing } from './bench-mixing.js';
import { benchmarkAutomation } from './bench-automation.js';
import { benchmarkFilterChain } from './bench-filter-chain.js';
import { benchmarkChannelOps } from './bench-channel-ops.js';
import { benchmarkNodeCreation } from './bench-node-creation.js';

// Import implementations
let implementations = [];

// Try to load webaudio-node (local)
try {
	const webaudioNode = await import('../../index.js');
	implementations.push({
		name: 'webaudio-node',
		OfflineAudioContext: webaudioNode.OfflineAudioContext,
		color: '\x1b[32m' // Green
	});
	console.log('✓ Loaded webaudio-node (local)');
} catch (e) {
	console.log('✗ Failed to load webaudio-node:', e.message);
}

// Try to load node-web-audio-api
try {
	const nodeWebAudio = await import('node-web-audio-api');
	implementations.push({
		name: 'node-web-audio-api',
		OfflineAudioContext: nodeWebAudio.OfflineAudioContext,
		color: '\x1b[34m' // Blue
	});
	console.log('✓ Loaded node-web-audio-api');
} catch (e) {
	console.log('✗ Failed to load node-web-audio-api:', e.message);
}

console.log(`\n📊 Running core benchmarks on ${implementations.length} implementation(s)...\n`);

const reset = '\x1b[0m';
const bold = '\x1b[1m';

function formatNumber(num, decimals = 2) {
	return num.toFixed(decimals);
}

function printHeader(title) {
	console.log(`\n${bold}═══ ${title} ═══${reset}\n`);
}

function printTable(headers, rows) {
	const colWidths = headers.map((h, i) => {
		const maxDataWidth = Math.max(...rows.map(r => String(r[i]).length));
		return Math.max(h.length, maxDataWidth) + 2;
	});

	const printRow = (cells, isBold = false) => {
		const formatted = cells.map((cell, i) => {
			const str = String(cell);
			return str.padEnd(colWidths[i]);
		}).join('│ ');
		console.log((isBold ? bold : '') + '│ ' + formatted + '│' + reset);
	};

	const printSeparator = () => {
		console.log('├─' + colWidths.map(w => '─'.repeat(w)).join('┼─') + '┤');
	};

	console.log('┌─' + colWidths.map(w => '─'.repeat(w)).join('┬─') + '┐');
	printRow(headers, true);
	printSeparator();
	rows.forEach(row => printRow(row));
	console.log('└─' + colWidths.map(w => '─'.repeat(w)).join('┴─') + '┘');
}

// Run benchmarks
const results = {};

for (const impl of implementations) {
	console.log(`\n${impl.color}${bold}Testing ${impl.name}...${reset}`);
	results[impl.name] = {};

	try {
		console.log('  Running offline rendering benchmark...');
		results[impl.name].offline = await benchmarkOfflineRendering(impl.OfflineAudioContext, 10);
	} catch (e) {
		console.log(`  ✗ Offline rendering failed: ${e.message}`);
		results[impl.name].offline = null;
	}

	try {
		console.log('  Running mixing benchmark...');
		results[impl.name].mixing = await benchmarkMixing(impl.OfflineAudioContext, 100, 5);
	} catch (e) {
		console.log(`  ✗ Mixing failed: ${e.message}`);
		results[impl.name].mixing = null;
	}

	try {
		console.log('  Running automation benchmark...');
		results[impl.name].automation = await benchmarkAutomation(impl.OfflineAudioContext, 1000, 5);
	} catch (e) {
		console.log(`  ✗ Automation failed: ${e.message}`);
		results[impl.name].automation = null;
	}

	try {
		console.log('  Running filter chain benchmark...');
		results[impl.name].filterChain = await benchmarkFilterChain(impl.OfflineAudioContext, 10);
	} catch (e) {
		console.log(`  ✗ Filter chain failed: ${e.message}`);
		results[impl.name].filterChain = null;
	}

	try {
		console.log('  Running channel operations benchmark...');
		results[impl.name].channelOps = await benchmarkChannelOps(impl.OfflineAudioContext, 10);
	} catch (e) {
		console.log(`  ✗ Channel ops failed: ${e.message}`);
		results[impl.name].channelOps = null;
	}

	try {
		console.log('  Running node creation benchmark...');
		results[impl.name].nodeCreation = await benchmarkNodeCreation(impl.OfflineAudioContext, 100);
	} catch (e) {
		console.log(`  ✗ Node creation failed: ${e.message}`);
		results[impl.name].nodeCreation = null;
	}
}

// Print results
printHeader('Offline Rendering (1 second of audio)');
{
	const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
	const rows = implementations.map(impl => {
		const r = results[impl.name].offline;
		if (!r) return [impl.name, 'FAILED', '-', '-'];
		return [
			impl.name,
			formatNumber(r.avgTimeMs, 2),
			formatNumber(r.realtimeMultiplier, 0) + 'x',
			formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
		];
	});
	printTable(headers, rows);
}

printHeader('Mixing Performance (100 simultaneous sources)');
{
	const headers = ['Implementation', 'Avg Time (ms)', 'Samples/sec'];
	const rows = implementations.map(impl => {
		const r = results[impl.name].mixing;
		if (!r) return [impl.name, 'FAILED', '-'];
		return [
			impl.name,
			formatNumber(r.avgTimeMs, 2),
			formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
		];
	});
	printTable(headers, rows);
}

printHeader('AudioParam Automation (1000 events)');
{
	const headers = ['Implementation', 'Schedule (ms)', 'Render (ms)', 'Total (ms)', 'Events/sec'];
	const rows = implementations.map(impl => {
		const r = results[impl.name].automation;
		if (!r) return [impl.name, 'FAILED', '-', '-', '-'];
		return [
			impl.name,
			formatNumber(r.avgScheduleTimeMs, 2),
			formatNumber(r.avgRenderTimeMs, 2),
			formatNumber(r.avgTotalTimeMs, 2),
			Math.round(r.eventsPerSec).toLocaleString()
		];
	});
	printTable(headers, rows);
}

printHeader('Filter Chain (5 cascaded biquad filters)');
{
	const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
	const rows = implementations.map(impl => {
		const r = results[impl.name].filterChain;
		if (!r) return [impl.name, 'FAILED', '-', '-'];
		return [
			impl.name,
			formatNumber(r.avgTimeMs, 2),
			formatNumber(r.realtimeMultiplier, 0) + 'x',
			formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
		];
	});
	printTable(headers, rows);
}

printHeader('Channel Operations (split/process/merge)');
{
	const headers = ['Implementation', 'Avg Time (ms)', 'Realtime Multiplier', 'Samples/sec'];
	const rows = implementations.map(impl => {
		const r = results[impl.name].channelOps;
		if (!r) return [impl.name, 'FAILED', '-', '-'];
		return [
			impl.name,
			formatNumber(r.avgTimeMs, 2),
			formatNumber(r.realtimeMultiplier, 0) + 'x',
			formatNumber(r.samplesPerSec / 1e6, 2) + 'M'
		];
	});
	printTable(headers, rows);
}

printHeader('Node Creation (150 nodes per iteration)');
{
	const headers = ['Implementation', 'Avg Time (ms)', 'Nodes/sec', 'Min Time (ms)'];
	const rows = implementations.map(impl => {
		const r = results[impl.name].nodeCreation;
		if (!r) return [impl.name, 'FAILED', '-', '-'];
		return [
			impl.name,
			formatNumber(r.avgTimeMs, 2),
			formatNumber(r.nodesPerSec / 1000, 1) + 'K',
			formatNumber(r.minTimeMs, 2)
		];
	});
	printTable(headers, rows);
}

// Calculate winners
printHeader('Summary');
{
	const categories = ['offline', 'mixing', 'automation', 'filterChain', 'channelOps', 'nodeCreation'];
	const categoryNames = {
		offline: 'Offline Rendering',
		mixing: 'Mixing',
		automation: 'Automation',
		filterChain: 'Filter Chain',
		channelOps: 'Channel Ops',
		nodeCreation: 'Node Creation'
	};

	const winners = {};
	const comparisons = {};

	for (const category of categories) {
		let bestValue = Infinity;
		let bestImpl = null;

		for (const impl of implementations) {
			const r = results[impl.name][category];
			if (!r) continue;

			let value;
			if (category === 'offline' || category === 'filterChain' || category === 'channelOps') {
				value = r.avgTimeMs;
			} else if (category === 'mixing') {
				value = r.avgTimeMs;
			} else if (category === 'automation') {
				value = r.avgTotalTimeMs;
			} else if (category === 'nodeCreation') {
				value = r.avgTimeMs;
			}

			if (value < bestValue) {
				bestValue = value;
				bestImpl = impl.name;
			}
		}

		winners[category] = bestImpl;

		// Calculate comparison
		const ourResult = results['webaudio-node']?.[category];
		const theirResult = results['node-web-audio-api']?.[category];
		if (ourResult && theirResult) {
			let ourValue, theirValue;
			if (category === 'offline' || category === 'filterChain' || category === 'channelOps') {
				ourValue = ourResult.samplesPerSec;
				theirValue = theirResult.samplesPerSec;
			} else if (category === 'mixing') {
				ourValue = ourResult.samplesPerSec;
				theirValue = theirResult.samplesPerSec;
			} else if (category === 'automation') {
				ourValue = ourResult.eventsPerSec;
				theirValue = theirResult.eventsPerSec;
			} else if (category === 'nodeCreation') {
				ourValue = ourResult.nodesPerSec;
				theirValue = theirResult.nodesPerSec;
			}

			const percentDiff = ((ourValue - theirValue) / theirValue * 100).toFixed(1);
			comparisons[category] = percentDiff;
		}
	}

	for (const category of categories) {
		const winner = winners[category];
		const comparison = comparisons[category];
		const symbol = comparison > 0 ? '✅' : '❌';
		const sign = comparison > 0 ? '+' : '';
		console.log(`${symbol} ${categoryNames[category].padEnd(20)} Winner: ${bold}${winner || 'N/A'}${reset}  (${sign}${comparison}%)`);
	}
}

console.log('\n✅ Benchmarks complete!\n');
