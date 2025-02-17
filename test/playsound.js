import { AudioContext } from '../index.js';
import { readFile } from 'fs/promises';
import path from 'path';

// get directory of this file
const __dirname = new URL('.', import.meta.url).pathname;

const audioContext = new AudioContext();


export async function loadSound(url) {
  const soundBuffer = await readFile(url);

  const audioBuffer = await audioContext.decodeAudioData(soundBuffer);
  return audioBuffer;
}

export function playSound(audioBuffer, loop = false) {
  if (!audioBuffer) {
    return;
  }
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;
  
  bufferSource.connect(audioContext.destination);
  if (loop) {
    bufferSource.loop = true;
  }
  bufferSource.start();
  bufferSource.onended = () => {
    bufferSource.disconnect();
  };
  return bufferSource;
}

async function main() {
  const file = path.join(__dirname, './laser.mp3');
  console.log('file', file);
  const audioBuffer = await loadSound(file);
  playSound(audioBuffer);
}

main();