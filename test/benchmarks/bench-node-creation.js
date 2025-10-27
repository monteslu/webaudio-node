/**
 * Benchmark: Node Creation/Destruction
 *
 * Tests dynamic node allocation and garbage collection
 * Creates and destroys many nodes rapidly
 */

export async function benchmarkNodeCreation(OfflineAudioContext, iterations = 100) {
	const sampleRate = 48000;
	const times = [];

	for (let i = 0; i < iterations; i++) {
		const ctx = new OfflineAudioContext({
			numberOfChannels: 2,
			length: 1024, // Very short buffer
			sampleRate: sampleRate
		});

		const start = performance.now();

		// Create many nodes rapidly
		const nodes = [];
		for (let j = 0; j < 50; j++) {
			nodes.push(ctx.createGain());
			nodes.push(ctx.createBiquadFilter());
			nodes.push(ctx.createDelay(1.0));
		}

		// Connect them in a chain
		const osc = ctx.createOscillator();
		let current = osc;
		for (let j = 0; j < nodes.length; j += 10) {
			current.connect(nodes[j]);
			current = nodes[j];
		}
		current.connect(ctx.destination);

		osc.start(0);

		const elapsed = performance.now() - start;
		times.push(elapsed);
	}

	const avgTime = times.reduce((a, b) => a + b) / times.length;
	const minTime = Math.min(...times);
	const nodesPerSec = (150 * 1000) / avgTime; // 150 nodes per iteration

	return {
		avgTimeMs: avgTime,
		minTimeMs: minTime,
		nodesPerSec: nodesPerSec,
		iterations: iterations
	};
}
