import { SUPPORTED_MEDIA_TYPES } from './constants.js';

/**
 * Identifies audio format from buffer header
 * @param {Buffer} buffer 
 * @returns {string|null} MIME type or null if format not recognized
 */
export function identifyAudioFormat(buffer) {
  if (buffer.length < 12) return null;

  // WAV: "RIFF" + 4 bytes + "WAVE"
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && 
      buffer.toString('ascii', 8, 12) === 'WAVE') {
    return 'audio/wav';
  }

  // MP3: First 11 bits should be all 1s (0xFFF) for MPEG frame sync
  if ((buffer[0] === 0xFF) && ((buffer[1] & 0xE0) === 0xE0)) {
    return 'audio/mpeg';
  }

  // OGG: "OggS"
  if (buffer.toString('ascii', 0, 4) === 'OggS') {
    return 'audio/ogg';
  }

  // Check for MP4 ftyp box
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (['M4A ', 'mp42', 'isom'].includes(brand)) {
      return 'audio/mp4';
    }
  }

  return null;
}

/**
 * Checks if format is supported
 * @param {string} format MIME type
 * @returns {boolean}
 */
export function isFormatSupported(format) {
  return SUPPORTED_MEDIA_TYPES.has(format);
}
