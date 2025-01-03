
## API

Implements the Web Audio API specification with Node including playback.

### Installation

```bash
npm install webaudio-node
```

### Requirements
- Node.js >= 20
- FFmpeg (https://ffmpeg.org/)
- SDL2 (https://www.libsdl.org/)



### Example Usage
```js
import { AudioContext } from 'webaudio-node';
import fs from 'fs/promises';

// Create audio context
const audioContext = new AudioContext();

async function run() {
  const fileData = await fs.readFile('/path/to/audio/file.mp3');
  
  // Decode the audio file
  const audioBuffer = await audioContext.decodeAudioData(fileData);

  // Create buffer source node
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Optional: Add event handler for when playback ends
  source.onended = () => {
    console.log('Playback finished');
    process.exit(0);
  };

  source.connect(audioContext.destination);
  source.start(0);
  console.log('Duration:', source.buffer.duration, 'seconds');
}

run();

```


### Currently Implemented Features

- `AudioContext`
- `AudioNode`
- `AudioBuffer`
- `AudioBufferSourceNode`
- `GainNode`
- `OscillatorNode`

### Planned Features

The following nodes are planned but not yet implemented:
- `AnalyserNode`
- `BiquadFilterNode`
- `DelayNode`
- `DynamicsCompressorNode`
- `PannerNode`
- `StereoPannerNode`


## Implementation Details

This module uses:
- SDL2 for audio output and device management
- FFmpeg for audio file decoding and encoding

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Issues and Support

Please report any issues or feature requests in the [GitHub issue tracker](https://github.com/monteslu/webaudio-node/issues).

## Acknowledgments

- Web Audio API specification
- SDL2 development team
- FFmpeg development team
