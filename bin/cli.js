#!/usr/bin/env node

import { AudioContext } from '../index.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('Usage: webaudio-node <audio-file>');
    console.error('');
    console.error('Supported formats: MP3, WAV, FLAC, OGG, AAC');
    console.error('');
    console.error('Examples:');
    console.error('  webaudio-node music.mp3');
    console.error('  webaudio-node /path/to/sound.wav');
    console.error('  npx webaudio-node audio.flac');
    process.exit(1);
}

const filePath = resolve(args[0]);

try {
    console.log(`Loading: ${filePath}`);
    const audioData = readFileSync(filePath);

    console.log('Decoding audio...');
    const ctx = new AudioContext({ sampleRate: 48000 });
    const buffer = await ctx.decodeAudioData(audioData.buffer);

    console.log(
        `Playing: ${buffer.duration.toFixed(2)}s, ${buffer.numberOfChannels} channel(s), ${buffer.sampleRate}Hz`
    );

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Handle playback completion
    source.onended = () => {
        console.log('Playback complete');
        ctx.close().then(() => process.exit(0));
    };

    source.start();
    await ctx.resume();
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
