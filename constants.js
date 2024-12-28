export const TWO_PI = 2 * Math.PI;

export const SUPPORTED_MEDIA_TYPES = new Set([
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aiff',
  'audio/x-aiff',
  'audio/basic',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/vorbis',
  'audio/webm',
]);

// Default values for audio parameters
export const DEFAULT_SAMPLE_RATE = 44100;
export const DEFAULT_CHANNELS = 2;
export const MIN_SAMPLE_VALUE = -1;
export const MAX_SAMPLE_VALUE = 1;
export const ZERO_SAMPLE_VALUE = 0;

// Processing constants
export const PROCESSING_QUANTUM = 128; // samples
export const PROCESSING_INTERVAL = 20; // ms
