// Shared WASM module instance
// This ensures WasmAudioEngine and WasmAudioDecoders use the same WASM instance

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

// Load UNIFIED WASM module ONCE at import time
// This module contains: audio graph + all nodes + decoders
const createUnifiedWebAudioModule = (await import(path.join(rootDir, 'dist', 'webaudio.mjs')))
    .default;

export const wasmModule = await createUnifiedWebAudioModule();
