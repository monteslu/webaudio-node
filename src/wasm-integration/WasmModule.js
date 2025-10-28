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

// Singleton WASM module
let _wasmModuleSingleton = null;

// Initialize singleton on module load
_wasmModuleSingleton = await createUnifiedWebAudioModule();

// Export singleton
export const wasmModule = _wasmModuleSingleton;

// Export factory function to create new WASM instances
export async function createWasmModule() {
    return await createUnifiedWebAudioModule();
}
