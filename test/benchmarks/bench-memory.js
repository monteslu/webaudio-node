/**
 * Benchmark: Memory Usage
 *
 * Tests memory efficiency when creating many buffer sources sharing the same buffer.
 * Compares buffer sharing implementations.
 */

export async function benchmarkMemory(OfflineAudioContext, numSources = 100) {
	const sampleRate = 48000;
	const duration = 0.1; // 100ms render
	const length = sampleRate * duration;

	// Force garbage collection if available
	if (global.gc) {
		global.gc();
	}

	// Wait for GC to settle
	await new Promise(resolve => setTimeout(resolve, 100));

	const memBefore = process.memoryUsage();

	const ctx = new OfflineAudioContext({
		numberOfChannels: 2,
		length: length,
		sampleRate: sampleRate
	});

	// Create a test buffer (1 second of audio)
	const bufferLength = sampleRate * 1.0;
	const buffer = ctx.createBuffer(2, bufferLength, sampleRate);

	for (let channel = 0; channel < 2; channel++) {
		const data = buffer.getChannelData(channel);
		for (let i = 0; i < bufferLength; i++) {
			data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
		}
	}

	// Create many buffer sources sharing the same buffer
	const sources = [];
	for (let i = 0; i < numSources; i++) {
		const source = ctx.createBufferSource();
		source.buffer = buffer; // Shared buffer
		source.connect(ctx.destination);
		source.start(0);
		sources.push(source);
	}

	const memAfter = process.memoryUsage();

	// Calculate memory delta
	const heapUsedDelta = memAfter.heapUsed - memBefore.heapUsed;
	const externalDelta = memAfter.external - memBefore.external;
	const totalDelta = heapUsedDelta + externalDelta;

	// Calculate buffer size
	const bufferSize = bufferLength * 2 * 4; // 2 channels * 4 bytes per float

	return {
		avgTimeMs: 0, // Memory test doesn't measure time, but included for compatibility
		numSources: numSources,
		bufferSizeBytes: bufferSize,
		heapUsedDeltaBytes: heapUsedDelta,
		externalDeltaBytes: externalDelta,
		totalDeltaBytes: totalDelta,
		bytesPerSource: totalDelta / numSources,
		memoryVsNaive: (totalDelta / (bufferSize * numSources)) * 100
	};
}
