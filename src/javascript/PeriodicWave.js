export class PeriodicWave {
    constructor(context, options = {}) {
        this.context = context;

        // Default to sine wave if no coefficients provided
        this.real = options.real ? new Float32Array(options.real) : new Float32Array([0, 0]);
        this.imag = options.imag ? new Float32Array(options.imag) : new Float32Array([0, 1]);

        // Validate
        if (this.real.length !== this.imag.length) {
            throw new Error('real and imag arrays must have the same length');
        }

        if (this.real.length < 2) {
            throw new Error('PeriodicWave arrays must have at least 2 elements');
        }

        // Store whether to disable normalization
        this.disableNormalization = options.disableNormalization || false;

        // Generate wavetable from Fourier coefficients
        this._generateWavetable();
    }

    _generateWavetable() {
        // Generate a wavetable (lookup table) from the Fourier coefficients
        // This is what the oscillator will use to generate the waveform
        const tableSize = 2048; // Standard size
        this.wavetable = new Float32Array(tableSize);

        // Build waveform using inverse Fourier transform
        for (let i = 0; i < tableSize; i++) {
            let sample = 0;
            const phase = (2 * Math.PI * i) / tableSize;

            // Sum up the harmonics
            for (let n = 0; n < this.real.length; n++) {
                const real = this.real[n];
                const imag = this.imag[n];

                // e^(i*n*phase) = cos(n*phase) + i*sin(n*phase)
                sample += real * Math.cos(n * phase) - imag * Math.sin(n * phase);
            }

            this.wavetable[i] = sample;
        }

        // Normalize if not disabled
        if (!this.disableNormalization) {
            let maxAbs = 0;
            for (let i = 0; i < tableSize; i++) {
                maxAbs = Math.max(maxAbs, Math.abs(this.wavetable[i]));
            }
            if (maxAbs > 0) {
                for (let i = 0; i < tableSize; i++) {
                    this.wavetable[i] /= maxAbs;
                }
            }
        }
    }
}
