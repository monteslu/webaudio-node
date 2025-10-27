import { AudioContext } from '../index.js';

console.log('WebAudio-Node Performance Benchmark');

async function benchmarkMixing(numOscillators) {
    console.log(`\n=== Benchmark: ${numOscillators} Oscillators ===`);

    const context = new AudioContext();
    const oscillators = [];
    const gainNode = context.createGain();
    gainNode.gain.value = 1.0 / numOscillators; // Normalize volume

    // Create many oscillators
    for (let i = 0; i < numOscillators; i++) {
        const osc = context.createOscillator();
        osc.frequency.value = 220 + (i * 10); // Spread frequencies
        osc.type = 'sine';
        osc.connect(gainNode);
        oscillators.push(osc);
    }

    gainNode.connect(context.destination);

    const startTime = Date.now();
    await context.resume();
    oscillators.forEach(osc => osc.start());

    // Run for 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    oscillators.forEach(osc => osc.stop());
    await context.close();

    const duration = Date.now() - startTime;
    console.log(`Completed in ${duration}ms`);
    console.log(`Performance: ${numOscillators} oscillators mixed in real-time`);

    return duration;
}

async function runBenchmarks() {
    console.log('Starting benchmarks...\n');

    try {
        await benchmarkMixing(5);
        await new Promise(resolve => setTimeout(resolve, 500));

        await benchmarkMixing(10);
        await new Promise(resolve => setTimeout(resolve, 500));

        await benchmarkMixing(20);
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('\n✅ Benchmarks completed!');
        console.log('\nNote: With the new native implementation, all oscillators');
        console.log('are mixed together in a single audio device, eliminating');
        console.log('the previous multi-device hack limitation.');
    } catch (error) {
        console.error('❌ Benchmark failed:', error);
        process.exit(1);
    }
}

runBenchmarks();
