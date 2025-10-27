import fs from 'fs';

const content = fs.readFileSync('/tmp/full-bench-results.txt', 'utf-8');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('           WEBAUDIO-NODE PERFORMANCE REPORT');
console.log('           After Optimization Session');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Parse results by finding pairs of lines with Rust and C++ times
const lines = content.split('\n');
const results = [];
let currentCategory = null;
let currentTest = null;

for (let i = 0; i < lines.length; i++) {
	const line = lines[i];

	// Category headers
	if (line.includes('═══') && !line.includes('Summary')) {
		currentCategory = line.replace(/═/g, '').replace(/\[1m|\[0m/g, '').trim();
		continue;
	}

	// Test names (bold lines before tables)
	if (line.includes('[1m') && line.includes(':') && !line.includes('│')) {
		currentTest = line.replace(/\[1m|\[0m/g, '').trim().replace(/:$/, '');
		continue;
	}

	// Parse table rows
	if (line.includes('node-web-audio-api') && line.includes('│')) {
		const rustMatch = line.match(/│\s*node-web-audio-api\s*│\s*(\d+\.?\d*)/);
		if (rustMatch && lines[i + 1]) {
			const cppMatch = lines[i + 1].match(/│\s*webaudio-node\s*│\s*(\d+\.?\d*)/);
			if (cppMatch && currentCategory) {
				const rustTime = parseFloat(rustMatch[1]);
				const cppTime = parseFloat(cppMatch[1]);
				const diff = ((cppTime / rustTime - 1) * 100);

				results.push({
					category: currentCategory,
					test: currentTest || currentCategory,
					rustTime,
					cppTime,
					diff,
					win: cppTime < rustTime
				});
			}
		}
	}
}

// Group by category
const byCategory = {};
for (const result of results) {
	if (!byCategory[result.category]) {
		byCategory[result.category] = { wins: 0, losses: 0, tests: [] };
	}
	byCategory[result.category].tests.push(result);
	if (result.win) {
		byCategory[result.category].wins++;
	} else {
		byCategory[result.category].losses++;
	}
}

let totalWins = 0;
let totalLosses = 0;

console.log('📊 EXECUTIVE SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════\n');

for (const [cat, data] of Object.entries(byCategory)) {
	totalWins += data.wins;
	totalLosses += data.losses;
}

console.log(`Total Tests: ${totalWins + totalLosses}`);
console.log(`✅ Wins:     ${totalWins} (${(totalWins / (totalWins + totalLosses) * 100).toFixed(1)}%)`);
console.log(`❌ Losses:   ${totalLosses} (${(totalLosses / (totalWins + totalLosses) * 100).toFixed(1)}%)`);
console.log(`🎯 Target:   100% wins\n`);

// Sort categories by win rate
const categoryStats = Object.entries(byCategory).map(([cat, data]) => {
	const total = data.wins + data.losses;
	return {
		category: cat,
		wins: data.wins,
		losses: data.losses,
		total,
		winRate: (data.wins / total * 100),
		tests: data.tests
	};
}).sort((a, b) => a.winRate - b.winRate);

console.log('\n📈 CATEGORIES BY WIN RATE (Lowest First = Needs Most Attention)');
console.log('═══════════════════════════════════════════════════════════════════\n');

for (const cat of categoryStats) {
	const icon = cat.winRate === 100 ? '✅' : cat.winRate >= 50 ? '⚠️ ' : '❌';
	console.log(`${icon} ${cat.category}`);
	console.log(`   Win Rate: ${cat.winRate.toFixed(1)}% (${cat.wins}/${cat.total})`);

	const losses = cat.tests.filter(t => !t.win).sort((a, b) => b.diff - a.diff);
	if (losses.length > 0) {
		console.log(`   Worst: ${losses[0].test || cat.category} (+${losses[0].diff.toFixed(1)}%)`);
	}

	const wins = cat.tests.filter(t => t.win).sort((a, b) => a.diff - b.diff);
	if (wins.length > 0) {
		console.log(`   Best:  ${wins[0].test || cat.category} (${wins[0].diff.toFixed(1)}%)`);
	}
	console.log();
}

console.log('\n🔥 TOP 15 LOSSES (Highest Priority Fixes)');
console.log('═══════════════════════════════════════════════════════════════════\n');

const allLosses = results.filter(r => !r.win).sort((a, b) => b.diff - a.diff);
for (let i = 0; i < Math.min(15, allLosses.length); i++) {
	const loss = allLosses[i];
	console.log(`${i + 1}. ${loss.category}${loss.test !== loss.category ? ': ' + loss.test : ''}`);
	console.log(`   ${loss.diff.toFixed(1)}% slower (Rust: ${loss.rustTime.toFixed(2)}ms → C++: ${loss.cppTime.toFixed(2)}ms)\n`);
}

console.log('\n✨ TOP 10 WINS (Biggest Performance Advantages)');
console.log('═══════════════════════════════════════════════════════════════════\n');

const allWins = results.filter(r => r.win).sort((a, b) => a.diff - b.diff);
for (let i = 0; i < Math.min(10, allWins.length); i++) {
	const win = allWins[i];
	console.log(`${i + 1}. ${win.category}${win.test !== win.category ? ': ' + win.test : ''}`);
	console.log(`   ${(-win.diff).toFixed(1)}% faster (Rust: ${win.rustTime.toFixed(2)}ms → C++: ${win.cppTime.toFixed(2)}ms)\n`);
}

console.log('\n💡 STRATEGIC RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Categories with 0% win rate
const zeroWinRate = categoryStats.filter(c => c.winRate === 0);
if (zeroWinRate.length > 0) {
	console.log('🚨 CRITICAL - Complete Failures (0% win rate):');
	for (const cat of zeroWinRate) {
		console.log(`   • ${cat.category} - ${cat.losses} tests failing`);
	}
	console.log();
}

// Categories with < 50% win rate
const lowWinRate = categoryStats.filter(c => c.winRate > 0 && c.winRate < 50);
if (lowWinRate.length > 0) {
	console.log('⚠️  HIGH PRIORITY - Low Win Rate (<50%):');
	for (const cat of lowWinRate) {
		console.log(`   • ${cat.category} - ${cat.winRate.toFixed(0)}% (${cat.wins}/${cat.total})`);
	}
	console.log();
}

// Categories with 50-90% win rate
const mediumWinRate = categoryStats.filter(c => c.winRate >= 50 && c.winRate < 90);
if (mediumWinRate.length > 0) {
	console.log('📈 MEDIUM PRIORITY - Room for Improvement (50-90%):');
	for (const cat of mediumWinRate) {
		console.log(`   • ${cat.category} - ${cat.winRate.toFixed(0)}% (${cat.wins}/${cat.total})`);
	}
	console.log();
}

// Categories with 100% win rate
const perfectWinRate = categoryStats.filter(c => c.winRate === 100);
if (perfectWinRate.length > 0) {
	console.log('✅ EXCELLENT - Perfect Score:');
	for (const cat of perfectWinRate) {
		console.log(`   • ${cat.category} - ${cat.total}/${cat.total} wins`);
	}
	console.log();
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(`           Report Complete - ${results.length} tests analyzed`);
console.log('═══════════════════════════════════════════════════════════════════\n');
