import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// SDL configuration - using build-sdl releases
const SDL_CONFIG = {
	owner: 'kmamal',
	repo: 'build-sdl',
	version: '2.32.8'
};

const platform = process.platform;
const arch = process.arch;

function getPlatformString() {
	if (platform === 'darwin') {
		return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
	} else if (platform === 'linux') {
		return arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
	} else if (platform === 'win32') {
		return 'win32-x64';
	}
	throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

async function download(url, dest) {
	return new Promise((resolve, reject) => {
		https.get(url, { headers: { 'User-Agent': 'webaudio-node' } }, (response) => {
			if (response.statusCode === 302 || response.statusCode === 301) {
				download(response.headers.location, dest).then(resolve, reject);
				return;
			}

			if (response.statusCode !== 200) {
				reject(new Error(`Failed to download: ${response.statusCode}`));
				return;
			}

			const file = fs.createWriteStream(dest);
			response.pipe(file);
			file.on('finish', () => {
				file.close();
				resolve();
			});
			file.on('error', reject);
		}).on('error', reject);
	});
}

async function main() {
	const platformString = getPlatformString();
	const sdlDir = path.join(rootDir, 'sdl');
	const tmpDir = path.join(rootDir, 'tmp');

	// Create directories
	fs.mkdirSync(sdlDir, { recursive: true });
	fs.mkdirSync(tmpDir, { recursive: true });

	const tarballPath = path.join(tmpDir, 'sdl.tar.gz');
	const url = `https://github.com/${SDL_CONFIG.owner}/${SDL_CONFIG.repo}/releases/download/${SDL_CONFIG.version}/${platformString}.tar.gz`;

	console.log(`Downloading SDL from: ${url}`);
	await download(url, tarballPath);

	console.log('Extracting SDL...');
	await tar.x({
		file: tarballPath,
		cwd: sdlDir,
	});

	// Clean up
	fs.rmSync(tmpDir, { recursive: true, force: true });

	// Set environment variables for node-gyp
	const incPath = path.join(sdlDir, 'include');
	const libPath = path.join(sdlDir, 'lib');

	console.log('SDL downloaded and extracted successfully');
	console.log(`SDL_INC=${incPath}`);
	console.log(`SDL_LIB=${libPath}`);

	// Write env file for builds
	const envContent = `export SDL_INC="${incPath}"\nexport SDL_LIB="${libPath}"\n`;
	fs.writeFileSync(path.join(rootDir, '.sdl-env'), envContent);
}

main().catch(console.error);
