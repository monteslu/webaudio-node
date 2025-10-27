/**
 * Procedural Sound Generation
 *
 * Demonstrates:
 * - Creating various sound effects from scratch
 * - Using OfflineAudioContext for fast rendering
 * - Parameter randomization for variations
 * - Filter usage
 */

import { AudioContext, OfflineAudioContext } from '../index.js';

// Generate variations of a sound
async function generateSoundVariations(generator, count) {
    const variations = [];
    for (let i = 0; i < count; i++) {
        variations.push(await generator(i));
    }
    return variations;
}

// Laser sound generator
async function generateLaser(variation) {
    const ctx = new OfflineAudioContext(2, 14400, 48000);

    const startFreq = 700 + Math.random() * 300;
    const endFreq = 150 + Math.random() * 150;

    const osc = ctx.createOscillator();
    osc.type = ['sawtooth', 'square'][Math.floor(Math.random() * 2)];
    osc.frequency.setValueAtTime(startFreq, 0);
    osc.frequency.exponentialRampToValueAtTime(endFreq, 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4 + Math.random() * 0.2, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(0);

    return await ctx.startRendering();
}

// Swoosh sound generator
async function generateSwoosh(variation) {
    const ctx = new OfflineAudioContext(2, 24000, 48000); // 0.5s

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, 0);
    osc.frequency.linearRampToValueAtTime(2000, 0.2);
    osc.frequency.linearRampToValueAtTime(100, 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000 + Math.random() * 1000;
    filter.Q.value = 5 + Math.random() * 10;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, 0);
    gain.gain.linearRampToValueAtTime(0.5, 0.1);
    gain.gain.linearRampToValueAtTime(0.01, 0.5);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(0);

    return await ctx.startRendering();
}

// Hit/impact sound generator
async function generateHit(variation) {
    const ctx = new OfflineAudioContext(2, 12000, 48000); // 0.25s

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100 + Math.random() * 100, 0);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, 0);
    filter.frequency.exponentialRampToValueAtTime(200, 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, 0.25);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(0);

    return await ctx.startRendering();
}

// Blip sound generator
async function generateBlip(variation) {
    const ctx = new OfflineAudioContext(2, 4800, 48000); // 0.1s

    const freq = 400 + variation * 100; // Ascending blips

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, 0.1);

    osc.connect(gain).connect(ctx.destination);
    osc.start(0);

    return await ctx.startRendering();
}

async function main() {
    console.log('🎨 Procedural Sound Generation\n');

    // Generate multiple variations of each sound type
    console.log('Generating sound variations...');
    const startTime = Date.now();

    const [lasers, swooshes, hits, blips] = await Promise.all([
        generateSoundVariations(generateLaser, 5),
        generateSoundVariations(generateSwoosh, 5),
        generateSoundVariations(generateHit, 5),
        generateSoundVariations(generateBlip, 5)
    ]);

    const genTime = Date.now() - startTime;
    console.log(`✅ Generated 20 sound variations in ${genTime}ms\n`);

    // Create real-time context for playback
    const ctx = new AudioContext({ sampleRate: 48000, channels: 2 });
    await ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);

    console.log('🎵 Playing demos...\n');

    // Play laser variations
    console.log('🔫 Laser variations (5):');
    for (let i = 0; i < lasers.length; i++) {
        const source = ctx.createBufferSource();
        source.buffer = lasers[i];
        source.connect(masterGain);
        source.start(ctx.currentTime + i * 0.4);
    }
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Play swoosh variations
    console.log('💨 Swoosh variations (5):');
    for (let i = 0; i < swooshes.length; i++) {
        const source = ctx.createBufferSource();
        source.buffer = swooshes[i];
        source.connect(masterGain);
        source.start(ctx.currentTime + i * 0.6);
    }
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Play hit variations
    console.log('💥 Hit variations (5):');
    for (let i = 0; i < hits.length; i++) {
        const source = ctx.createBufferSource();
        source.buffer = hits[i];
        source.connect(masterGain);
        source.start(ctx.currentTime + i * 0.3);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Play blip sequence
    console.log('🎶 Blip sequence (5 notes):');
    for (let i = 0; i < blips.length; i++) {
        const source = ctx.createBufferSource();
        source.buffer = blips[i];
        source.connect(masterGain);
        source.start(ctx.currentTime + i * 0.15);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));

    await ctx.close();
    console.log('\n✅ Demo complete!\n');

    console.log('📊 Statistics:');
    console.log(`  - Generated 20 sounds in ${genTime}ms`);
    console.log(`  - Average: ${(genTime / 20).toFixed(1)}ms per sound`);
    console.log(`  - Speed: ${(20 / (genTime / 1000)).toFixed(0)} sounds/second`);
    console.log('\n💡 Each sound has random variations!');
    console.log('   Run again to hear different versions.');
}

main().catch(console.error);
