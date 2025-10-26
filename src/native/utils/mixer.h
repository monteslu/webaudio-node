#ifndef WEBAUDIO_MIXER_H
#define WEBAUDIO_MIXER_H

namespace webaudio {

class Mixer {
public:
	// Mix source into destination with gain
	static void Mix(float* dest, const float* src, int sample_count, float gain = 1.0f);

	// Clear buffer
	static void Clear(float* buffer, int sample_count);

	// Copy buffer
	static void Copy(float* dest, const float* src, int sample_count);

	// Apply gain to buffer
	static void ApplyGain(float* buffer, int sample_count, float gain);

	// Clip/limit buffer
	static void Clip(float* buffer, int sample_count, float min = -1.0f, float max = 1.0f);
};

} // namespace webaudio

#endif // WEBAUDIO_MIXER_H
