import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function main() {
	// Check if build directory exists
	const buildDir = path.join(rootDir, 'build', 'Release');
	if (fs.existsSync(path.join(buildDir, 'webaudio_native.node'))) {
		console.log('Native addon already built');
		return;
	}

	// TODO: Implement prebuilt binary download from GitHub releases
	console.log('Prebuilt binaries not yet available, building from source...');
	execSync('node scripts/build.mjs', { cwd: rootDir, stdio: 'inherit' });
}

main().catch((error) => {
	console.error('Installation failed:', error);
	process.exit(1);
});
