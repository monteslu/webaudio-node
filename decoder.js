import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

export async function decodeAudioData(audioData, device) {
  const buffer = Buffer.from(audioData);
  const tempDir = path.join('.', 'webaudio_temp');
  const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2);
  const inputPath = path.join(tempDir, `input_${uniqueId}`);
  const outputPath = path.join(tempDir, `output_${uniqueId}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPath, buffer);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('f32le')
        .outputOptions([
          '-ac', '2',
          '-ar', '44100'
        ])
        .on('error', reject)
        .on('end', resolve)
        .save(outputPath);
    });

    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(inputPath, { force: true }).catch(() => {});
    await fs.rm(outputPath, { force: true }).catch(() => {});
  }
}