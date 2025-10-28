import { OfflineAudioContext } from './index-wasm.js';

console.log('\n🔍 Testing if unsupported nodes get nodeId=0 and output silence...\n');

const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: 48000, sampleRate: 48000 });

// Create oscillator (supported)
const osc = ctx.createOscillator();
console.log('Oscillator nodeId:', osc._nodeId);

// Create ConvolverNode (unsupported in minimal WASM)
const conv = ctx.createConvolver();
console.log('ConvolverNode nodeId:', conv._nodeId);

// Create gain (supported)
const gain = ctx.createGain();
console.log('Gain nodeId:', gain._nodeId);

// Connect: osc -> convolver -> gain -> destination
osc.connect(conv);
conv.connect(gain);
gain.connect(ctx.destination);

osc.start(0);

console.log('\nRendering audio through: oscillator -> convolver -> gain -> destination');
const buffer = await ctx.startRendering();

const left = buffer.getChannelData(0);
const right = buffer.getChannelData(1);

// Check if output is silent (convolver with ID=0 outputs zeros)
const isSilent = left.every(s => s === 0) && right.every(s => s === 0);

console.log('\nResult:');
console.log('First 10 samples (left):', left.slice(0, 10));
console.log('Is output silent?', isSilent);

if (isSilent) {
    console.log('\n❌ CONFIRMED: ConvolverNode with nodeId=0 acts as a silent node!');
    console.log('   This explains why tests "pass" - unsupported nodes just output silence.');
} else {
    console.log('\n✅ Output has signal - ConvolverNode is actually working!');
}

console.log('\n🔍 Now testing direct connection (no convolver):');
const ctx2 = new OfflineAudioContext({ numberOfChannels: 2, length: 48000, sampleRate: 48000 });
const osc2 = ctx2.createOscillator();
const gain2 = ctx2.createGain();
osc2.connect(gain2);
gain2.connect(ctx2.destination);
osc2.start(0);

const buffer2 = await ctx2.startRendering();
const left2 = buffer2.getChannelData(0);
console.log('First 10 samples (direct):', left2.slice(0, 10));
console.log('Has signal?', !left2.every(s => s === 0));

process.exit(0);
