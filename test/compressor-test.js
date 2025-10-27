import { AudioContext } from '../src/javascript/index.js';

const context = new AudioContext();

async function testDynamicsCompressor() {
    console.log('\n=== Testing DynamicsCompressorNode ===\n');

    // Create compressor
    const compressor = context.createDynamicsCompressor();
    console.log('✓ Created DynamicsCompressorNode');

    // Test default values
    console.log('Default threshold:', compressor.threshold.value, 'dB');
    console.log('Default knee:', compressor.knee.value, 'dB');
    console.log('Default ratio:', compressor.ratio.value);
    console.log('Default attack:', compressor.attack.value, 's');
    console.log('Default release:', compressor.release.value, 's');
    console.log('Default reduction:', compressor.reduction, 'dB');

    // Test setting parameters
    compressor.threshold.value = -30;
    compressor.knee.value = 20;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.5;
    console.log('✓ Set compressor parameters');

    // Create loud oscillator to trigger compression
    const osc = context.createOscillator();
    osc.frequency.value = 200;
    osc.type = 'sine';

    const preGain = context.createGain();
    preGain.gain.value = 2.0; // Make it loud to trigger compression

    osc.connect(preGain);
    preGain.connect(compressor);
    compressor.connect(context.destination);
    console.log('✓ Connected osc -> gain -> compressor -> destination');

    // Start audio
    await context.resume();
    osc.start();
    console.log('✓ Started loud oscillator');

    // Monitor compression over time
    console.log('\nMonitoring gain reduction:');
    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const reduction = compressor.reduction;
        console.log(`  ${i * 100}ms: ${reduction.toFixed(2)} dB reduction`);
    }

    // Test with quieter signal
    preGain.gain.value = 0.1; // Make it quiet
    console.log('\nReduced input level to 0.1');

    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Final reduction: ${compressor.reduction.toFixed(2)} dB`);

    // Stop
    osc.stop();
    await context.suspend();
    console.log('✓ Stopped oscillator');

    console.log('\n=== DynamicsCompressorNode Test Complete ===\n');
}

async function testLimiter() {
    console.log('\n=== Testing Limiter Mode ===\n');

    // Configure as limiter (high ratio, fast attack)
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 0;
    limiter.ratio.value = 20; // Very high ratio
    limiter.attack.value = 0.001; // Very fast attack
    limiter.release.value = 0.1;
    console.log('✓ Created limiter (ratio 20:1, 1ms attack)');

    // Create very loud oscillator
    const osc = context.createOscillator();
    osc.frequency.value = 440;
    osc.type = 'sine';

    const preGain = context.createGain();
    preGain.gain.value = 5.0; // Very loud

    osc.connect(preGain);
    preGain.connect(limiter);
    limiter.connect(context.destination);
    console.log('✓ Connected very loud source (gain 5.0)');

    await context.resume();
    osc.start();

    // Monitor limiting
    console.log('\nMonitoring limiting:');
    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const reduction = limiter.reduction;
        console.log(`  ${i * 50}ms: ${reduction.toFixed(2)} dB reduction`);
    }

    osc.stop();
    await context.suspend();
    console.log('✓ Stopped');

    console.log('\n=== Limiter Test Complete ===\n');
}

async function testCompressionCurve() {
    console.log('\n=== Testing Compression Curve ===\n');

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;

    const osc = context.createOscillator();
    osc.frequency.value = 300;

    const preGain = context.createGain();
    preGain.gain.value = 0.1;

    osc.connect(preGain);
    preGain.connect(compressor);
    compressor.connect(context.destination);

    await context.resume();
    osc.start();
    console.log('✓ Started with quiet signal');

    // Slowly increase gain and watch compression kick in
    console.log('\nIncreasing input level, watching compression:');
    for (let i = 0; i <= 10; i++) {
        const gain = i * 0.5; // 0 to 5
        preGain.gain.value = gain;
        await new Promise(resolve => setTimeout(resolve, 100));
        const reduction = compressor.reduction;
        console.log(`  Gain ${gain.toFixed(1)}: ${reduction.toFixed(2)} dB reduction`);
    }

    osc.stop();
    await context.suspend();
    console.log('✓ Stopped');

    console.log('\n=== Compression Curve Test Complete ===\n');
}

// Run tests
try {
    await testDynamicsCompressor();
    await testLimiter();
    await testCompressionCurve();
    console.log('\n✅ All DynamicsCompressorNode tests passed!\n');
    await context.close();
    process.exit(0);
} catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
}
