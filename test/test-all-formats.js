// Test all audio format decoders

import { readFile } from 'fs/promises';
import { WasmAudioDecoders } from './src/wasm-integration/WasmAudioDecoders.js';

async function testFormat(name, path, decoderFunc) {
    console.log(`\n${name}:`);
    console.log('='.repeat(50));

    try {
        const data = await readFile(path);
        console.log(`  File size: ${(data.length / 1024).toFixed(1)} KB`);

        const startTime = Date.now();
        const result = await decoderFunc(data.buffer);
        const decodeTime = Date.now() - startTime;

        console.log(`  ✓ Decoded in ${decodeTime}ms`);
        console.log(`  Sample rate: ${result.sampleRate} Hz`);
        console.log(`  Channels: ${result.channels}`);
        console.log(`  Duration: ${(result.length / result.sampleRate).toFixed(2)}s`);
        console.log(`  Total samples: ${result.audioData.length}`);
        console.log(
            `  First 5 samples: [${Array.from(result.audioData.slice(0, 5))
                .map(v => v.toFixed(4))
                .join(', ')}]`
        );

        return { success: true, time: decodeTime, result };
    } catch (error) {
        console.log(`  ✗ Failed: ${error.message}`);
        return { success: false, error };
    }
}

async function main() {
    console.log('Testing WASM Audio Decoders');
    console.log('='.repeat(50));

    const basePath = './test/samples/rising_sun';

    const results = {
        mp3: await testFormat(
            'MP3',
            `${basePath}.mp3`,
            WasmAudioDecoders.decodeMP3.bind(WasmAudioDecoders)
        ),
        wav: await testFormat(
            'WAV',
            `${basePath}.wav`,
            WasmAudioDecoders.decodeWAV.bind(WasmAudioDecoders)
        ),
        flac: await testFormat(
            'FLAC',
            `${basePath}.flac`,
            WasmAudioDecoders.decodeFLAC.bind(WasmAudioDecoders)
        ),
        ogg: await testFormat(
            'OGG/Vorbis',
            `${basePath}.ogg`,
            WasmAudioDecoders.decodeVorbis.bind(WasmAudioDecoders)
        ),
        aac: await testFormat(
            'AAC',
            `${basePath}.aac`,
            WasmAudioDecoders.decodeAAC.bind(WasmAudioDecoders)
        )
    };

    // Test auto-detection
    console.log('\n\nAuto-Detection Test:');
    console.log('='.repeat(50));
    for (const [format, path] of [
        ['MP3', `${basePath}.mp3`],
        ['WAV', `${basePath}.wav`],
        ['FLAC', `${basePath}.flac`],
        ['OGG', `${basePath}.ogg`],
        ['AAC', `${basePath}.aac`]
    ]) {
        const data = await readFile(path);
        const result = await WasmAudioDecoders.decode(data.buffer);
        console.log(
            `  ${format}: ✓ Auto-detected and decoded (${result.channels}ch, ${result.sampleRate}Hz)`
        );
    }

    // Summary
    console.log('\n\nSummary:');
    console.log('='.repeat(50));
    const successful = Object.values(results).filter(r => r.success).length;
    console.log(`  ${successful}/5 formats decoded successfully`);

    if (successful === 5) {
        console.log('\n  Decode times:');
        for (const [format, result] of Object.entries(results)) {
            if (result.success) {
                console.log(`    ${format.toUpperCase()}: ${result.time}ms`);
            }
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
