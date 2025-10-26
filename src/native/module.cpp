#include <napi.h>
#include "audio_engine.h"
#include "offline_audio_engine.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	webaudio::AudioEngine::Init(env, exports);
	webaudio::OfflineAudioEngine::Init(env, exports);
	return exports;
}

NODE_API_MODULE(webaudio_native, Init)
