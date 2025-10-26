# AnalyserNode Reference Testing

This directory contains tools for generating and testing AnalyserNode against Chrome's Web Audio API implementation.

## Why Reference Testing?

The Web Audio API specification leaves some implementation details open, and comparing against Chrome's implementation ensures:
- **Compatibility**: Our implementation produces results similar to the browser standard
- **Correctness**: FFT calculations and data conversions match expected behavior
- **Regression Detection**: Changes don't break compatibility

## Workflow

### Step 1: Generate Reference Data

1. Open `test/generate-reference-data.html` in **Google Chrome**
2. Select an audio file (MP3, WAV, etc.) - ideally place in `test/samples/`
3. Click "Generate Reference Data"
4. Click "Download All JSON Files"
5. Save the downloaded file as `test/reference-data/analyser-reference-data.json`

**Recommended test file**: A short (3-5 second) music clip with known frequency content

### Step 2: Run Comparison Test

```bash
node test/analyser-reference-test.js
```

This will:
- Load the reference data from Chrome
- Process the same audio through the Node.js implementation
- Compare all four data output methods:
  - `getFloatFrequencyData()`
  - `getByteFrequencyData()`
  - `getFloatTimeDomainData()`
  - `getByteTimeDomainData()`
- Report any differences

## Understanding Test Results

### Perfect Match
```
✅ All tests passed!
```
All FFT sizes and data types match within tolerance.

### Acceptable Differences
Small differences are expected due to:
- **Floating point precision**: Different CPU architectures
- **FFT algorithm variations**: Both implementations may use slightly different optimizations
- **Audio decoding**: MP3 decoding can vary slightly

**Tolerance levels**:
- Float data: 1% relative difference allowed
- Byte data: Exact match expected
- Up to 5% of samples can differ

### Problematic Differences
Large differences may indicate:
- Incorrect FFT implementation
- Wrong window function
- Incorrect magnitude/decibel conversion
- Buffer ordering issues

## Tips

### Using a Simple Test Signal

For more deterministic testing, modify the test to use a pure sine wave instead of a file:

```javascript
// In analyser-reference-test.js
const freq = 440; // Hz
for (let i = 0; i < sampleRate; i++) {
    channelData[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
}
```

Then generate reference data in Chrome using the same synthetic signal.

### Testing Specific Features

To test specific aspects:
- **FFT accuracy**: Use pure sine waves at known frequencies
- **Windowing**: Use square waves to see window function effects
- **Smoothing**: Enable smoothingTimeConstant and compare temporal behavior
- **Decibel conversion**: Use signals at known amplitudes

## File Structure

```
test/
├── generate-reference-data.html   # Browser-based reference generator
├── analyser-reference-test.js     # Node.js comparison test
├── reference-data/
│   └── analyser-reference-data.json  # Chrome's output (git-ignored)
└── samples/
    └── *.mp3                      # Test audio files (git-ignored)
```

## Troubleshooting

### "Could not load reference data"
Generate the reference data first using the HTML page.

### Tests always fail
1. Ensure you're using the same audio source
2. Check that sample rates match
3. Try with a simple synthetic signal
4. Verify FFT size and smoothing settings match

### Large differences in specific frequency bins
This is often normal - FFT bins near strong frequencies can vary.
Look for patterns across multiple bins rather than individual values.
