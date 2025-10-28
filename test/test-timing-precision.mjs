import { AudioContext } from '../index.js';

console.log('🎯 Testing scheduled audio timing precision...\n');

// Create a simple test tone buffer
const sampleRate = 48000;
const duration = 0.1; // 100ms beep
const frequency = 440;

const ctx = new AudioContext({ sampleRate });

// Create a buffer with a sine wave
const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
const channelData = buffer.getChannelData(0);
for (let i = 0; i < channelData.length; i++) {
    channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
}

// Track when sources actually start playing by monitoring audio output
const scheduledTimes = [];
const sources = [];

// Schedule 5 sources at 0.5 second intervals
for (let i = 0; i < 5; i++) {
    const startTime = i * 0.5;
    scheduledTimes.push(startTime);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(startTime);
    sources.push(source);

    console.log(`Scheduled source ${i + 1} at ${startTime.toFixed(2)}s`);
}

await ctx.resume();
const testStart = Date.now();
console.log(`\nContext resumed at t=0, currentTime=${ctx.currentTime.toFixed(3)}s`);

// Monitor currentTime to see if it advances properly
const measurements = [];
for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 250)); // Check every 250ms
    const elapsed = (Date.now() - testStart) / 1000;
    const ctxTime = ctx.currentTime;
    measurements.push({ elapsed, ctxTime });
    console.log(`At t=${elapsed.toFixed(3)}s: ctx.currentTime=${ctxTime.toFixed(3)}s (diff=${Math.abs(elapsed - ctxTime).toFixed(3)}s)`);
}

await ctx.close();

console.log('\n📊 Analysis:');
console.log('Expected behavior: ctx.currentTime should closely match elapsed wall-clock time');

const errors = measurements.map(m => Math.abs(m.elapsed - m.ctxTime));
const avgError = errors.reduce((a, b) => a + b) / errors.length;
const maxError = Math.max(...errors);

console.log(`Average timing error: ${(avgError * 1000).toFixed(1)}ms`);
console.log(`Maximum timing error: ${(maxError * 1000).toFixed(1)}ms`);

if (maxError > 0.1) {
    console.log('\n❌ FAILED: Timing drift exceeds 100ms');
    console.log('Sources scheduled at specific times will not play at the correct times!');
    process.exit(1);
} else {
    console.log('\n✅ PASSED: Timing is accurate within 100ms');
}
