import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { AudioBuffer } from './AudioBuffer.js';

export async function decodeAudioData(audioData, context) {
  if (!(audioData instanceof ArrayBuffer)) {
    throw new DOMException('audioData must be an ArrayBuffer', 'InvalidStateError');
  }

  let tempInputPath = null;
  let tempOutputPath = null;
  const buffer = Buffer.from(audioData);

  try {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempDir = path.join('.', 'webaudio_temp');
    tempInputPath = path.join(tempDir, `input_${uniqueId}`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}`);

    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(tempInputPath, buffer);

    // Get audio metadata
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempInputPath, (err, data) => {
        if (err) {
          reject(new DOMException(`Failed to probe audio file: ${err.message}`, 'EncodingError'));
        } else {
          resolve(data);
        }
      });
    });

    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
    if (!audioStream) {
      throw new DOMException('No audio stream found', 'EncodingError');
    }

    const originalChannels = audioStream.channels;
    const originalSampleRate = parseInt(audioStream.sample_rate);

    console.log('File metadata:', {
      channels: originalChannels,
      sampleRate: originalSampleRate,
      duration: audioStream.duration,
      sdlSampleRate: context.sampleRate,
      sdlChannels: context._channels
    });

    // Decode to raw PCM, explicitly maintaining original sample rate
    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .format('f32le')
        .audioChannels(originalChannels)
        .audioFrequency(originalSampleRate)
        .output(tempOutputPath)
        .outputOption('-ar', originalSampleRate) // Force output sample rate
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('error', (err) => {
          reject(new DOMException(`Decoding failed: ${err.message}`, 'EncodingError'));
        })
        .on('end', resolve)
        .run();
    });

    // Read decoded data
    const rawData = await fs.readFile(tempOutputPath);
    console.log('Decoded data size:', {
      bytes: rawData.length,
      expectedSamples: rawData.length / 4 / originalChannels,
      expectedDuration: (rawData.length / 4 / originalChannels) / originalSampleRate
    });

    const floatArray = new Float32Array(rawData.buffer, rawData.byteOffset, rawData.length / 4);

    // Create AudioBuffer
    const audioBuffer = new AudioBuffer({
      length: floatArray.length / originalChannels,
      numberOfChannels: originalChannels,
      sampleRate: originalSampleRate
    });

    // Deinterleave channels
    for (let channel = 0; channel < originalChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = floatArray[i * originalChannels + channel];
      }
    }

    console.log('Created AudioBuffer:', {
      length: audioBuffer.length,
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration
    });

    return audioBuffer;

  } finally {
    // Clean up temp files
    try {
      if (tempInputPath) {
        await fs.rm(tempInputPath, { force: true });
      }
      if (tempOutputPath) {
        await fs.rm(tempOutputPath, { force: true });
      }
    } catch (e) {
      console.error('Error cleaning up temp files:', e);
    }
  }
}