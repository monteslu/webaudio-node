// Test WASM MP3 decoder

import { readFile } from 'fs/promises';
import { WasmAudioDecoders } from '../src/wasm-integration/WasmAudioDecoders.js';

async function test() {
    console.log('Testing WASM MP3 decoder...');

    // Load MP3 file
    const mp3Data = await readFile('./test/laser.mp3');
    console.log(`Loaded MP3 file: ${mp3Data.length} bytes`);

    // Decode with WASM
    const startTime = Date.now();
    const result = await WasmAudioDecoders.decodeMP3(mp3Data.buffer);
    const decodeTime = Date.now() - startTime;

    console.log(`✓ Decoded successfully in ${decodeTime}ms`);
    console.log(`  Sample rate: ${result.sampleRate} Hz`);
    console.log(`  Channels: ${result.channels}`);
    console.log(
        `  Length: ${result.length} frames (${(result.length / result.sampleRate).toFixed(2)}s)`
    );
    console.log(`  Total samples: ${result.audioData.length}`);
    console.log(
        `  First 10 samples: [${Array.from(result.audioData.slice(0, 10))
            .map(v => v.toFixed(4))
            .join(', ')}]`
    );
}

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
