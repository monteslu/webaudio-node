import { OfflineAudioContext } from './src/javascript/index.js';

console.log('\n🔬 Profiling mixing performance...\n');

const ctx = new OfflineAudioContext({
	numberOfChannels: 2,
	length: 48000, // 1 second
	sampleRate: 48000
});

// Create shared buffer
const buffer = ctx.createBuffer(2, 48000, 48000);
for (let ch = 0; ch < 2; ch++) {
	const data = buffer.getChannelData(ch);
	for (let i = 0; i < data.length; i++) {
		data[i] = Math.sin(2 * Math.PI * 440 * i / 48000) * 0.3;
	}
}

// Create 100 buffer sources
console.log('Creating 100 buffer sources...');
const sources = [];
for (let i = 0; i < 100; i++) {
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.connect(ctx.destination);
	sources.push(source);
}

console.log('Starting all sources...');
for (const source of sources) {
	source.start(0);
}

console.log('Rendering...');
const renderStart = performance.now();
const rendered = await ctx.startRendering();
const renderTime = performance.now() - renderStart;

console.log(`\n✅ Rendered in ${renderTime.toFixed(2)}ms`);
console.log(`Samples/sec: ${(48000 * 2 / (renderTime / 1000) / 1000000).toFixed(2)}M`);

// Check output
const data = rendered.getChannelData(0);
const max = Math.max(...data.slice(0, 1000));
console.log(`Max amplitude: ${max.toFixed(3)}`);
