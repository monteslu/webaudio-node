import fs from 'fs';

const resultsFile = process.argv[2] || '/tmp/full-bench-results.txt';
const content = fs.readFileSync(resultsFile, 'utf-8');

const runs = content.split('=== Run ');
const numRuns = runs.length - 1;

console.log('═══════════════════════════════════════════════════════════════════');
console.log('           WEBAUDIO-NODE PERFORMANCE REPORT');
console.log('           Comprehensive Benchmark Analysis');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Extract all benchmark results
const benchmarks = {};

// Find all table comparisons
const tableRegex = /│\s*(node-web-audio-api|webaudio-node)\s*│\s*(\d+\.?\d*)\s*│/g;
const benchmarkSections = content.split(/═══\s+(.+?)\s+═══/);

let currentCategory = null;
const results = [];

for (let i = 1; i < benchmarkSections.length; i += 2) {
	const categoryName = benchmarkSections[i].trim();
	const categoryContent = benchmarkSections[i + 1];

	// Skip summary sections
	if (categoryName.toLowerCase().includes('summary')) continue;

	// Find all tables in this section
	const lines = categoryContent.split('\n');
	let testName = null;
	let rustTime = null;
	let cppTime = null;

	for (const line of lines) {
		// Check if this is a test name line (bold text)
		if (line.includes('[1m') && !line.includes('Implementation')) {
			testName = line.replace(/\[1m|\[0m|│/g, '').trim().replace(/:/g, '');
		}

		// Extract times
		const match = tableRegex.exec(line);
		if (match) {
			const impl = match[1];
			const time = parseFloat(match[2]);

			if (impl === 'node-web-audio-api') {
				rustTime = time;
			} else if (impl === 'webaudio-node') {
				cppTime = time;
			}

			// If we have both times, record the result
			if (rustTime !== null && cppTime !== null && testName) {
				const diff = ((cppTime / rustTime - 1) * 100);
				results.push({
					category: categoryName,
					test: testName,
					rustTime,
					cppTime,
					diff,
					win: cppTime < rustTime
				});
				rustTime = null;
				cppTime = null;
			}
		}
	}
}

// Group by category
const byCategory = {};
for (const result of results) {
	if (!byCategory[result.category]) {
		byCategory[result.category] = [];
	}
	byCategory[result.category].push(result);
}

// Generate report
let totalWins = 0;
let totalLosses = 0;
const categories = [];

for (const [category, tests] of Object.entries(byCategory)) {
	const wins = tests.filter(t => t.win).length;
	const losses = tests.length - wins;
	totalWins += wins;
	totalLosses += losses;

	const avgDiff = tests.reduce((sum, t) => sum + t.diff, 0) / tests.length;
	const biggestWin = tests.filter(t => t.win).sort((a, b) => a.diff - b.diff)[0];
	const biggestLoss = tests.filter(t => !t.win).sort((a, b) => b.diff - a.diff)[0];

	categories.push({
		category,
		tests,
		wins,
		losses,
		avgDiff,
		biggestWin,
		biggestLoss,
		winRate: (wins / tests.length * 100)
	});
}

// Sort categories by win rate (lowest first - these need attention)
categories.sort((a, b) => a.winRate - b.winRate);

console.log('📊 EXECUTIVE SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════\n');
console.log(`Total Tests: ${totalWins + totalLosses}`);
console.log(`✅ Wins:     ${totalWins} (${(totalWins / (totalWins + totalLosses) * 100).toFixed(1)}%)`);
console.log(`❌ Losses:   ${totalLosses} (${(totalLosses / (totalWins + totalLosses) * 100).toFixed(1)}%)`);
console.log(`🎯 Target:   100% wins\n`);

console.log('\n📈 CATEGORIES BY WIN RATE (Lowest First = Highest Priority)');
console.log('═══════════════════════════════════════════════════════════════════\n');

for (const cat of categories) {
	const icon = cat.winRate === 100 ? '✅' : cat.winRate >= 50 ? '⚠️ ' : '❌';
	console.log(`${icon} ${cat.category}`);
	console.log(`   Win Rate: ${cat.winRate.toFixed(1)}% (${cat.wins}/${cat.tests.length})`);
	console.log(`   Avg Diff: ${cat.avgDiff >= 0 ? '+' : ''}${cat.avgDiff.toFixed(1)}%`);

	if (cat.biggestLoss) {
		console.log(`   Worst Loss: ${cat.biggestLoss.test} (+${cat.biggestLoss.diff.toFixed(1)}% slower)`);
	}
	if (cat.biggestWin) {
		console.log(`   Best Win: ${cat.biggestWin.test} (${cat.biggestWin.diff.toFixed(1)}% faster)`);
	}
	console.log();
}

console.log('\n🔥 CRITICAL ISSUES (All Losses)');
console.log('═══════════════════════════════════════════════════════════════════\n');

const allLosses = categories.flatMap(c => c.tests.filter(t => !t.win))
	.sort((a, b) => b.diff - a.diff);

if (allLosses.length === 0) {
	console.log('🎉 NO LOSSES! Perfect score!\n');
} else {
	for (let i = 0; i < Math.min(allLosses.length, 20); i++) {
		const loss = allLosses[i];
		console.log(`${i + 1}. ${loss.category}: ${loss.test}`);
		console.log(`   +${loss.diff.toFixed(1)}% slower (Rust: ${loss.rustTime.toFixed(2)}ms, C++: ${loss.cppTime.toFixed(2)}ms)\n`);
	}
}

console.log('\n✨ TOP WINS');
console.log('═══════════════════════════════════════════════════════════════════\n');

const allWins = categories.flatMap(c => c.tests.filter(t => t.win))
	.sort((a, b) => a.diff - b.diff);

for (let i = 0; i < Math.min(allWins.length, 10); i++) {
	const win = allWins[i];
	console.log(`${i + 1}. ${win.category}: ${win.test}`);
	console.log(`   ${win.diff.toFixed(1)}% faster (Rust: ${win.rustTime.toFixed(2)}ms, C++: ${win.cppTime.toFixed(2)}ms)\n`);
}

console.log('\n💡 RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Identify patterns in losses
const lossByCategory = {};
for (const loss of allLosses) {
	lossByCategory[loss.category] = (lossByCategory[loss.category] || 0) + 1;
}

const sortedCategories = Object.entries(lossByCategory)
	.sort((a, b) => b[1] - a[1]);

console.log('Priority Focus Areas:\n');
for (let i = 0; i < Math.min(sortedCategories.length, 5); i++) {
	const [category, count] = sortedCategories[i];
	const catData = categories.find(c => c.category === category);
	console.log(`${i + 1}. ${category} - ${count} losses (${(100 - catData.winRate).toFixed(0)}% failure rate)`);
}

console.log('\n\n═══════════════════════════════════════════════════════════════════');
console.log(`Report generated from ${numRuns} benchmark runs`);
console.log('═══════════════════════════════════════════════════════════════════\n');
