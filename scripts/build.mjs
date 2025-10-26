import { execSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Get SDL paths from build-sdl
const sdlDist = require('@kmamal/build-sdl');
const SDL_INC = path.join(sdlDist, 'include');
const SDL_LIB = path.join(sdlDist, 'lib');

console.log('Building native addon...');
console.log(`SDL_INC=${SDL_INC}`);
console.log(`SDL_LIB=${SDL_LIB}`);

try {
	execSync('npx node-gyp rebuild', {
		cwd: rootDir,
		stdio: 'inherit',
		env: {
			...process.env,
			SDL_INC,
			SDL_LIB,
		}
	});

	// Copy SDL libraries to build directory
	console.log('Copying SDL libraries...');
	const buildLib = path.join(rootDir, 'build', 'Release');
	execSync(`cp -P ${SDL_LIB}/*.dylib ${buildLib}/`, { cwd: rootDir });

	console.log('Build completed successfully');
} catch (error) {
	console.error('Build failed:', error.message);
	process.exit(1);
}
