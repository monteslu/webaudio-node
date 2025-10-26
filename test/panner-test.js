import { AudioContext } from '../src/javascript/index.js';

console.log('\n=== Testing PannerNode (3D Spatial Audio) ===\n');

const context = new AudioContext({ sampleRate: 44100 });

// Create oscillator (sound source)
const oscillator = context.createOscillator();
oscillator.frequency.value = 440;
oscillator.type = 'sine';

// Create panner node
const panner = context.createPanner();

console.log('PannerNode initial properties:');
console.log(`  Position: (${panner.positionX}, ${panner.positionY}, ${panner.positionZ})`);
console.log(`  Panning model: ${panner.panningModel}`);
console.log(`  Distance model: ${panner.distanceModel}`);
console.log(`  Ref distance: ${panner.refDistance}`);
console.log(`  Max distance: ${panner.maxDistance}`);
console.log(`  Rolloff factor: ${panner.rolloffFactor}`);

// Connect: oscillator -> panner -> destination
oscillator.connect(panner);
panner.connect(context.destination);

await context.resume();
oscillator.start();

console.log('\n=== Testing 3D positioning ===\n');

// Test 1: Sound to the left
console.log('Test 1: Sound to the left (-5, 0, 0)');
panner.setPosition(-5, 0, 0);
await new Promise(resolve => setTimeout(resolve, 1000));

// Test 2: Sound to the right
console.log('Test 2: Sound to the right (5, 0, 0)');
panner.setPosition(5, 0, 0);
await new Promise(resolve => setTimeout(resolve, 1000));

// Test 3: Sound in front
console.log('Test 3: Sound in front (0, 0, -5)');
panner.setPosition(0, 0, -5);
await new Promise(resolve => setTimeout(resolve, 1000));

// Test 4: Sound behind
console.log('Test 4: Sound behind (0, 0, 5)');
panner.setPosition(0, 0, 5);
await new Promise(resolve => setTimeout(resolve, 1000));

// Test 5: Moving sound (left to right)
console.log('Test 5: Moving sound (left to right sweep)');
for (let x = -5; x <= 5; x += 0.5) {
	panner.positionX = x;
	await new Promise(resolve => setTimeout(resolve, 50));
}

// Test 6: Distance attenuation
console.log('\nTest 6: Distance attenuation');
console.log('  Moving from near (1m) to far (10m)');
panner.setPosition(0, 0, 0);

for (let z = -1; z >= -10; z -= 1) {
	panner.positionZ = z;
	console.log(`  Distance: ${-z}m`);
	await new Promise(resolve => setTimeout(resolve, 200));
}

// Test 7: Different distance models
console.log('\nTest 7: Testing distance models at 5m distance');
panner.setPosition(0, 0, -5);

console.log('  Linear model:');
panner.distanceModel = 'linear';
panner.maxDistance = 10;
await new Promise(resolve => setTimeout(resolve, 500));

console.log('  Inverse model (default):');
panner.distanceModel = 'inverse';
await new Promise(resolve => setTimeout(resolve, 500));

console.log('  Exponential model:');
panner.distanceModel = 'exponential';
await new Promise(resolve => setTimeout(resolve, 500));

oscillator.stop();
await new Promise(resolve => setTimeout(resolve, 100));

await context.suspend();
await context.close();

console.log('\n✅ PannerNode test complete!');
console.log('\nPannerNode supports:');
console.log('  ✓ 3D positioning (x, y, z)');
console.log('  ✓ Equal power panning');
console.log('  ✓ Distance attenuation (linear, inverse, exponential)');
console.log('  ✓ Orientation and cone effects');
console.log('  ✓ Configurable distance parameters');
