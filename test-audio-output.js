#!/usr/bin/env node

// Test if audio output works with a simple 440Hz tone

import { AudioContext } from './index.js';

const ctx = new AudioContext({ sampleRate: 44100, channels: 2 });

const osc = ctx.createOscillator();
osc.frequency.value = 440; // A4 note
osc.type = 'sine';

const gain = ctx.createGain();
gain.gain.value = 0.3;

osc.connect(gain);
gain.connect(ctx.destination);

console.log('Playing 440Hz tone for 2 seconds...');
console.log('If you hear a beep, audio output is working!');

osc.start();
await ctx.resume();

setTimeout(() => {
    console.log('Stopping...');
    osc.stop();
    ctx.close();
    process.exit(0);
}, 2000);
