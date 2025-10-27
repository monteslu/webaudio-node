/**
 * Music Player with 3-Band Equalizer
 *
 * Demonstrates:
 * - MP3 decoding
 * - Biquad filters for EQ
 * - Real-time audio playback
 */

import { AudioContext, decodeAudioFile } from '../index.js';

async function main() {
    // Check for MP3 file argument
    if (process.argv.length < 3) {
        console.log('Usage: node music-player.js <path-to-mp3>');
        console.log('Example: node music-player.js ../test/fixtures/rising_sun.mp3');
        process.exit(1);
    }

    const mp3Path = process.argv[2];

    console.log('🎵 Music Player with EQ\n');
    console.log(`Loading: ${mp3Path}...`);

    const ctx = new AudioContext({
        sampleRate: 48000,
        channels: 2
    });

    // Decode audio file
    const buffer = await decodeAudioFile(mp3Path, ctx.sampleRate);
    console.log(
        `✅ Loaded: ${buffer.duration.toFixed(2)}s, ${buffer.sampleRate}Hz, ${buffer.numberOfChannels}ch\n`
    );

    // Create source
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = false;

    // 3-Band EQ
    const lowBand = ctx.createBiquadFilter();
    lowBand.type = 'lowshelf';
    lowBand.frequency.value = 200;
    lowBand.gain.value = 0; // dB

    const midBand = ctx.createBiquadFilter();
    midBand.type = 'peaking';
    midBand.frequency.value = 1000;
    midBand.Q.value = 1.0;
    midBand.gain.value = 0; // dB

    const highBand = ctx.createBiquadFilter();
    highBand.type = 'highshelf';
    highBand.frequency.value = 3000;
    highBand.gain.value = 0; // dB

    // Master volume
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;

    // Connect: source → EQ → master → output
    source
        .connect(lowBand)
        .connect(midBand)
        .connect(highBand)
        .connect(masterGain)
        .connect(ctx.destination);

    // Start playback
    await ctx.resume();
    source.start();

    console.log('🎶 Now playing...\n');
    console.log('EQ Settings:');
    console.log(`  Low  (${lowBand.frequency.value}Hz):  ${lowBand.gain.value}dB`);
    console.log(`  Mid  (${midBand.frequency.value}Hz):  ${midBand.gain.value}dB`);
    console.log(`  High (${highBand.frequency.value}Hz):  ${highBand.gain.value}dB`);
    console.log(`  Master Volume: ${(masterGain.gain.value * 100).toFixed(0)}%\n`);

    console.log('💡 Try adjusting EQ in the code and reload!');

    // Keep alive
    await new Promise(resolve => {
        source.onended = resolve;
        setTimeout(resolve, buffer.duration * 1000 + 500);
    });

    await ctx.close();
    console.log('\n✅ Playback finished');
}

main().catch(console.error);
