import { OfflineAudioContext as RustContext } from 'node-web-audio-api';
import { OfflineAudioContext as CppContext } from '../../index.js';
import { benchmarkChannelCounts } from './bench-channel-counts.js';
import { benchmarkSampleRates } from './bench-sample-rates.js';
import { benchmarkFFTSizes } from './bench-fft-sizes.js';

console.log('Quick Status Check (3 iterations each)\n');

const results = {
	channels: { wins: 0, losses: 0 },
	sampleRates: { wins: 0, losses: 0 },
	fftSizes: { wins: 0, losses: 0 }
};

// Channel counts
console.log('Testing Channel Counts...');
const channelRust = await benchmarkChannelCounts(RustContext, 3);
const channelCpp = await benchmarkChannelCounts(CppContext, 3);
for (const ch of [1, 2, 4, 6, 8]) {
	if (channelCpp[ch].avgTimeMs < channelRust[ch].avgTimeMs) {
		results.channels.wins++;
		console.log(`  ${ch}ch: WIN`);
	} else {
		results.channels.losses++;
		console.log(`  ${ch}ch: LOSS`);
	}
}

// Sample rates
console.log('\nTesting Sample Rates...');
const srRust = await benchmarkSampleRates(RustContext, 3);
const srCpp = await benchmarkSampleRates(CppContext, 3);
for (const sr of [8000, 16000, 22050, 44100, 48000, 96000]) {
	if (srCpp[sr].avgTimeMs < srRust[sr].avgTimeMs) {
		results.sampleRates.wins++;
		console.log(`  ${sr}Hz: WIN`);
	} else {
		results.sampleRates.losses++;
		console.log(`  ${sr}Hz: LOSS`);
	}
}

// FFT sizes
console.log('\nTesting FFT Sizes...');
const fftRust = await benchmarkFFTSizes(RustContext, 3);
const fftCpp = await benchmarkFFTSizes(CppContext, 3);
for (const size of [256, 512, 1024, 2048, 4096, 8192, 16384, 32768]) {
	if (fftCpp[size].avgTimeMs < fftRust[size].avgTimeMs) {
		results.fftSizes.wins++;
		console.log(`  FFT ${size}: WIN`);
	} else {
		results.fftSizes.losses++;
		console.log(`  FFT ${size}: LOSS`);
	}
}

console.log('\n=== SUMMARY ===');
console.log(`Channel Counts: ${results.channels.wins}/${results.channels.wins + results.channels.losses} wins`);
console.log(`Sample Rates: ${results.sampleRates.wins}/${results.sampleRates.wins + results.sampleRates.losses} wins`);
console.log(`FFT Sizes: ${results.fftSizes.wins}/${results.fftSizes.wins + results.fftSizes.losses} wins`);

const totalWins = results.channels.wins + results.sampleRates.wins + results.fftSizes.wins;
const totalTests = results.channels.wins + results.channels.losses + results.sampleRates.wins + results.sampleRates.losses + results.fftSizes.wins + results.fftSizes.losses;
console.log(`\nOVERALL: ${totalWins}/${totalTests} wins (${(totalWins/totalTests*100).toFixed(1)}%)`);
