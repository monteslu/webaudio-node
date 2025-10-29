#!/usr/bin/env node

import { AudioContext } from '../index.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);

// Parse flags
const flags = {
    reverb: args.includes('--reverb'),
    autoTune: args.includes('--auto-tune'),
    pickDevices: args.includes('--pick-devices'),
    help: args.includes('--help') || args.includes('-h')
};

// Remove flags from args to get file path
const fileArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));

// Show help
if (flags.help || (args.length === 0 && !flags.reverb && !flags.autoTune)) {
    console.log('Usage: webaudio-node [options] [audio-file]');
    console.log('');
    console.log('Options:');
    console.log('  --reverb             Open microphone with reverb effect');
    console.log('  --auto-tune          Open microphone with auto-tune effect');
    console.log('  --pick-devices       Choose input/output devices interactively');
    console.log('  -h, --help           Show this help message');
    console.log('');
    console.log('Supported formats: MP3, WAV, FLAC, OGG, AAC');
    console.log('');
    console.log('Examples:');
    console.log('  webaudio-node music.mp3');
    console.log('  webaudio-node --reverb');
    console.log('  webaudio-node --auto-tune');
    console.log('  npx webaudio-node audio.flac');
    process.exit(flags.help ? 0 : 1);
}

// Device picker helper using blessed UI
async function pickDevices() {
    const blessed = (await import('blessed')).default;
    const sdl = (await import('@kmamal/sdl')).default;

    const devices = sdl.audio.devices || [];
    const recordingDevices = devices.filter(d => d.type === 'recording');
    const playbackDevices = devices.filter(d => d.type === 'playback');

    return new Promise(resolve => {
        const screen = blessed.screen({
            smartCSR: true,
            title: 'Device Selection'
        });

        let selectedInput = null;
        let selectedOutput = null;
        let currentStep = 'input'; // 'input' or 'output'

        const box = blessed.box({
            top: 'center',
            left: 'center',
            width: '80%',
            height: '80%',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'cyan'
                }
            },
            scrollable: true,
            keys: true,
            vi: true
        });

        const updateContent = () => {
            let content = '';

            if (currentStep === 'input') {
                content = '\n  {bold}🎙️  Select Input Device{/bold}\n\n';
                content += '  Press number key to select, or Enter for system default:\n\n';
                recordingDevices.forEach((d, i) => {
                    content += `    {yellow-fg}[${i + 1}]{/yellow-fg} ${d.name}\n`;
                });
                content += '\n    {yellow-fg}[Enter]{/yellow-fg} System Default\n';
            } else if (currentStep === 'output') {
                content = '\n  {bold}🔊 Select Output Device{/bold}\n\n';
                if (selectedInput) {
                    content += `  {green-fg}✓ Input: ${selectedInput.name}{/green-fg}\n\n`;
                } else {
                    content += '  {green-fg}✓ Input: System Default{/green-fg}\n\n';
                }
                content += '  Press number key to select, or Enter for system default:\n\n';
                playbackDevices.forEach((d, i) => {
                    content += `    {yellow-fg}[${i + 1}]{/yellow-fg} ${d.name}\n`;
                });
                content += '\n    {yellow-fg}[Enter]{/yellow-fg} System Default\n';
            }

            content += '\n\n  {gray-fg}Press Q or Escape to cancel{/gray-fg}';
            box.setContent(content);
            screen.render();
        };

        screen.append(box);
        box.focus();

        screen.key(['escape', 'q', 'C-c'], () => {
            screen.destroy();
            process.exit(0);
        });

        screen.key(['enter'], () => {
            if (currentStep === 'input') {
                // No input selected, use default
                currentStep = 'output';
                updateContent();
            } else {
                // No output selected, use default
                screen.destroy();
                resolve({ input: selectedInput, output: selectedOutput });
            }
        });

        // Handle number key presses
        for (let i = 1; i <= 9; i++) {
            screen.key([i.toString()], () => {
                if (currentStep === 'input') {
                    if (i <= recordingDevices.length) {
                        selectedInput = recordingDevices[i - 1];
                        currentStep = 'output';
                        updateContent();
                    }
                } else {
                    if (i <= playbackDevices.length) {
                        selectedOutput = playbackDevices[i - 1];
                        screen.destroy();
                        resolve({ input: selectedInput, output: selectedOutput });
                    }
                }
            });
        }

        updateContent();
    });
}

// Handle microphone effects
if (flags.reverb || flags.autoTune) {
    const selectedDevices = flags.pickDevices ? await pickDevices() : { input: null, output: null };
    await runMicrophoneEffect(flags.reverb ? 'reverb' : 'auto-tune', selectedDevices);
} else {
    // Play audio file
    await playAudioFile(fileArgs[0]);
}

async function playAudioFile(filePath) {
    if (!filePath) {
        console.error('Error: No audio file specified');
        console.error('Run with --help for usage information');
        process.exit(1);
    }

    const fullPath = resolve(filePath);

    try {
        console.log(`Loading: ${fullPath}`);
        const audioData = readFileSync(fullPath);

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
}

async function runMicrophoneEffect(effectType, devices = { input: null, output: null }) {
    try {
        // Create audio context
        const ctx = new AudioContext({ sampleRate: 44100, channels: 2 });

        // Set output device if specified
        if (devices.output) {
            // Hash the device name to get sinkId (same hashing function as in WasmAudioContext)
            const hashString = str => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = (hash << 5) - hash + char;
                    hash = hash & hash;
                }
                return Math.abs(hash).toString(16).padStart(8, '0');
            };
            await ctx.setSinkId(hashString(devices.output.name));
        }

        // Create media stream source for microphone
        const source = ctx.createMediaStreamSource({
            mediaStream: { id: 'microphone' }
        });

        // Apply the requested effect using ALL the real nodes
        let effectOutput;
        if (effectType === 'reverb') {
            effectOutput = createReverbEffect(ctx, source);
        } else if (effectType === 'auto-tune') {
            effectOutput = createAutoTuneEffect(ctx, source);
        } else {
            throw new Error('Unknown effect type: ' + effectType);
        }

        // Connect to destination
        effectOutput.connect(ctx.destination);

        // Start audio context and microphone capture (pure Web Audio API!)
        await ctx.resume();

        // Start microphone - SDL callback goes directly to WASM ring buffer
        const inputDevice = devices.input || { type: 'recording' };
        await source.start(inputDevice);

        // Setup blessed UI for level meter
        const blessed = (await import('blessed')).default;
        const screen = blessed.screen({
            smartCSR: true,
            title: 'Microphone Monitor'
        });

        const box = blessed.box({
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            content: 'Audio Levels',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'cyan'
                }
            },
            scrollable: true,
            alwaysScroll: true
        });

        screen.append(box);
        screen.key(['escape', 'q', 'C-c'], () => cleanup());

        // Add 'w' key to trigger WASM debug - writes "DEBUG TRIGGER" to stderr which WASM will see
        screen.key(['w'], () => {
            // Trigger some WASM calls to see if they produce debug output
            const available = source.getAvailableSamples();
            const level = source.getCurrentLevel();
            const capturing = source._isCapturing;
            box.setContent(
                box.getContent() +
                    `\n\n  {yellow-fg}WASM check: ${available} samples, level=${level.toFixed(4)}, capturing=${capturing}{/yellow-fg}`
            );
            screen.render();
            setTimeout(() => updateUI(), 2000);
        });

        // Add 'd' key to dump debug info to file
        screen.key(['d'], async () => {
            const timestamp = Date.now();

            // Calculate current metrics
            const inputLevel = source.getCurrentLevel();
            const lastAvailableInRing = source.getAvailableSamples();

            const debugInfo = `
MICROPHONE ${effectType.toUpperCase()} EFFECT - DEBUG SNAPSHOT
Generated: ${new Date().toISOString()}
Timestamp: ${timestamp}

SELECTED DEVICES:
  Input:  ${devices.input ? devices.input.name : 'System Default'}
  Output: ${devices.output ? devices.output.name : 'System Default'}

INPUT LEVEL:
  Current dB: ${inputLevel > 0 ? (20 * Math.log10(inputLevel)).toFixed(1) : -100} dB
  Current RMS: ${inputLevel.toFixed(6)}

MICROPHONE INPUT:
  Samples in ring buffer: ${lastAvailableInRing}

AUDIO CONTEXT:
  State: ${ctx.state}
  Sample rate: ${ctx.sampleRate} Hz
  Channels: ${ctx._channels}
  Current time: ${ctx.currentTime.toFixed(2)}s

SDL OUTPUT DEVICE:
  Queued bytes: ${queuedBytesInfo}
  Queued seconds: ${(queuedBytesInfo / (ctx.sampleRate * ctx._channels * 4)).toFixed(2)}s
  Device object exists: ${ctx._audioDevice ? 'YES' : 'NO'}
  Device state: ${ctx._audioDevice ? (ctx._audioDevice.paused ? 'PAUSED' : 'PLAYING') : 'N/A'}

AUDIO GRAPH:
  Source node ID: ${source.nodeId}
  Source _isCapturing: ${source._isCapturing}
  Source _wasmState: ${source._wasmState ? 'exists' : 'null'}
  Source outputs: ${source._outputs ? source._outputs.length : 0}
  Destination node ID: ${ctx.destination._nodeId || ctx.destination.nodeId}
  Graph ID: ${ctx._engine.graphId}
  Effect chain: source(${source.nodeId}) -> ${effectOutput ? 'effect(' + (effectOutput._nodeId || effectOutput.nodeId) + ')' : 'none'} -> destination(${ctx.destination._nodeId})
`;
            // Write to file AND clipboard
            try {
                writeFileSync('/tmp/mic-debug-latest.txt', debugInfo);
                const { default: clipboardy } = await import('clipboardy');
                await clipboardy.write(debugInfo);
                box.setContent(
                    box.getContent() +
                        '\n\n  {green-fg}✓ Saved to /tmp/mic-debug-latest.txt & clipboard{/green-fg}'
                );
            } catch (err) {
                box.setContent(box.getContent() + `\n\n  {red-fg}✗ Error: ${err.message}{/red-fg}`);
            }
            screen.render();
            setTimeout(() => updateUI(), 2000); // Resume normal updates after 2 seconds
        });
        screen.render();

        // UI state
        let running = true;
        let queuedBytesInfo = 0;

        // Handle graceful shutdown
        const cleanup = () => {
            if (!running) return;
            running = false;

            screen.destroy();
            console.log('\n\n👋 Stopping microphone...');
            try {
                source.stop();
                ctx.close();
            } catch {
                // Ignore cleanup errors
            }
            process.exit(0);
        };

        // Update UI with level meter
        const updateUI = () => {
            if (!running) return;

            // Get RMS level from MediaStreamSourceNode
            const inputLevel = source.getCurrentLevel();
            const dbLevel = inputLevel > 0 ? 20 * Math.log10(inputLevel) : -100;
            const normalizedDb = Math.max(-60, Math.min(0, dbLevel)); // Clamp to -60dB to 0dB
            const barLength = Math.floor(((normalizedDb + 60) / 60) * 50); // 50 chars wide

            // Create level meter bar
            const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);

            // Color based on level
            let color = 'green';
            if (normalizedDb > -10) color = 'red';
            else if (normalizedDb > -20) color = 'yellow';

            // Get SDL output queue status
            queuedBytesInfo = ctx._audioDevice ? ctx._audioDevice.queued : 0;
            const queuedSeconds = queuedBytesInfo / (ctx.sampleRate * ctx._channels * 4);

            const inputDeviceName = devices.input ? devices.input.name : 'System Default';

            const content = `
  {bold}🎤 ${effectType.toUpperCase()} - ${inputDeviceName}{/bold}

  {cyan-fg}LEVEL:{/cyan-fg} {${color}-fg}${bar}{/${color}-fg} ${normalizedDb.toFixed(1)}dB

  {cyan-fg}INPUT:{/cyan-fg} InRing:${source.getAvailableSamples()} Capturing:${source._isCapturing ? 'Y' : 'N'}
  {cyan-fg}CTX:{/cyan-fg} ${ctx.state} ${ctx.sampleRate}Hz Time:${ctx.currentTime.toFixed(1)}s
  {cyan-fg}SDL:{/cyan-fg} Queued:${queuedSeconds.toFixed(2)}s ${ctx._audioDevice ? (ctx._audioDevice.paused ? 'PAUSED' : 'PLAYING') : 'OFF'}
  {cyan-fg}GRAPH:{/cyan-fg} Src:${source.nodeId} Dst:${ctx.destination._nodeId || ctx.destination.nodeId} Effect:${effectOutput ? effectOutput._nodeId || effectOutput.nodeId : 'N/A'}
  {cyan-fg}WASM:{/cyan-fg} State:${source._wasmState} SrcCh:${source._channels} CtxCh:${ctx._channels} Active:${source._isCapturing ? 'Y' : 'N'}

  {gray-fg}W=Check WASM | D=Copy debug | Q=Quit{/gray-fg}
`;

            box.setContent(content);
            screen.render();

            // Update UI every 50ms
            setTimeout(updateUI, 50);
        };

        // Start UI update loop
        updateUI();

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nMake sure:');
        console.error('  • SDL2 is installed: sudo apt-get install libsdl2-dev');
        console.error('  • Your system has a microphone');
        console.error('  • You have audio permissions');
        console.error('  • Try: npm rebuild @kmamal/sdl');
        process.exit(1);
    }
}

// Effect functions for microphone processing
function createReverbEffect(ctx, source) {
    // Create impulse response for reverb (simulating a medium hall)
    const sampleRate = ctx.sampleRate;
    const duration = 1.5; // 1.5 second reverb tail (shorter for lower latency)
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);

    // Generate impulse response with exponential decay
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            // Random noise with exponential decay
            const decay = Math.exp((-3 * i) / length);
            channelData[i] = (Math.random() * 2 - 1) * decay;
        }
    }

    // Create convolver node
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse;

    // Create wet/dry mix
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0.6; // 60% dry
    wetGain.gain.value = 0.8; // 80% wet

    // Connect audio graph
    source.connect(dryGain);
    source.connect(reverb);
    reverb.connect(wetGain);

    // Mix dry and wet signals
    const output = ctx.createGain();
    output.gain.value = 3.0; // Boost overall volume (mic input is quiet)
    dryGain.connect(output);
    wetGain.connect(output);

    return output;
}

function createAutoTuneEffect(ctx, source) {
    // Auto-tune effect using ring modulation for robotic/vocoder sound
    // This creates the classic "T-Pain" auto-tune robotic effect

    const output = ctx.createGain();

    // Create a pitched oscillator (this is the "auto-tuned" pitch)
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 220; // A3 - auto-tune to this pitch
    carrier.start();

    // Create a gain node to use as a ring modulator
    // Ring modulation = multiply two signals together
    const ringMod = ctx.createGain();
    ringMod.gain.value = 0; // Start at 0, will be modulated by the carrier

    // Connect carrier to the gain's gain parameter to modulate it
    const carrierGain = ctx.createGain();
    carrierGain.gain.value = 1.0;
    carrier.connect(carrierGain);
    carrierGain.connect(ringMod.gain);

    // Connect source through the ring modulator
    source.connect(ringMod);

    // Add a highpass to remove low rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 100;

    ringMod.connect(highpass);

    // Boost the effect with makeup gain
    const makeupGain = ctx.createGain();
    makeupGain.gain.value = 3.0;
    highpass.connect(makeupGain);

    // Mix with dry signal for clarity
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.3;
    source.connect(dryGain);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.7;
    makeupGain.connect(wetGain);

    // Combine wet and dry
    dryGain.connect(output);
    wetGain.connect(output);

    // Heavy compression for that "squashed" sound
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    output.connect(compressor);

    // Final output with slight reverb
    const finalOutput = ctx.createGain();
    const reverb = createSimpleReverb(ctx, compressor);
    reverb.connect(finalOutput);

    return finalOutput;
}

function createSimpleReverb(ctx, source) {
    const sampleRate = ctx.sampleRate;
    const duration = 0.5; // Shorter reverb for auto-tune
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            const decay = Math.exp((-5 * i) / length);
            channelData[i] = (Math.random() * 2 - 1) * decay;
        }
    }

    const reverb = ctx.createConvolver();
    reverb.buffer = impulse;

    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0.8;
    wetGain.gain.value = 0.3;

    source.connect(dryGain);
    source.connect(reverb);
    reverb.connect(wetGain);

    const output = ctx.createGain();
    dryGain.connect(output);
    wetGain.connect(output);

    return output;
}
