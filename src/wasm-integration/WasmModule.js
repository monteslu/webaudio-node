// WASM module factory - creates a new instance per AudioContext
// This ensures each context has its own isolated WASM heap

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

// Load UNIFIED WASM module factory
// This module contains: audio graph + all nodes + decoders
const createUnifiedWebAudioModule = (await import(path.join(rootDir, 'dist', 'webaudio.mjs')))
    .default;

// Export factory function to create new WASM instances (preferred for OfflineAudioContext)
export async function createWasmModule() {
    return await createUnifiedWebAudioModule();
}

// LEGACY: Export singleton for MediaStreamSourceNode (real-time audio context)
// TODO: Refactor MediaStreamSourceNode to use per-context WASM instance
export const wasmModule = await createUnifiedWebAudioModule();
