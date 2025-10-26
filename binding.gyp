{
	'targets': [{
		'target_name': 'webaudio_native',
		'sources': [
			'src/native/module.cpp',
			'src/native/audio_engine.cpp',
			'src/native/offline_audio_engine.cpp',
			'src/native/audio_graph.cpp',
			'src/native/audio_param.cpp',
			'src/native/nodes/audio_node.cpp',
			'src/native/nodes/destination_node.cpp',
			'src/native/nodes/buffer_source_node.cpp',
			'src/native/nodes/gain_node.cpp',
			'src/native/nodes/oscillator_node.cpp',
			'src/native/nodes/biquad_filter_node.cpp',
			'src/native/nodes/delay_node.cpp',
			'src/native/nodes/stereo_panner_node.cpp',
			'src/native/nodes/constant_source_node.cpp',
			'src/native/nodes/channel_splitter_node.cpp',
			'src/native/nodes/channel_merger_node.cpp',
			'src/native/nodes/analyser_node.cpp',
			'src/native/nodes/dynamics_compressor_node.cpp',
			'src/native/nodes/wave_shaper_node.cpp',
			'src/native/nodes/iir_filter_node.cpp',
			'src/native/nodes/convolver_node.cpp',
			'src/native/nodes/panner_node.cpp',
			'src/native/nodes/audio_worklet_node.cpp',
			'src/native/nodes/media_stream_source_node.cpp',
			'src/native/utils/mixer.cpp',
			'src/native/utils/resampler.cpp',
			'src/native/utils/fft.cpp',
			'src/native/utils/logger.cpp',
		],
		'dependencies': [
			"<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except",
		],
		'defines': [
			'NAPI_VERSION=<(napi_build_version)',
			'NODE_ADDON_API_DISABLE_DEPRECATED',
		],
		'cflags': [ '-Werror', '-Wall', '-Wextra' ],
		'conditions': [
			['OS == "linux"', {
				'cflags': [ '-D_REENTRANT' ],
				'cflags_cc': [ '-std=c++17', '-frtti' ],
				'include_dirs': [ '$(SDL_INC)' ],
				'libraries': [ '-L$(SDL_LIB)', '-lSDL2' ],
				'link_settings': {
					'libraries': [ "-Wl,-rpath,'$$ORIGIN'" ],
				},
				'conditions': [
					['target_arch == "arm64"', {
						'cflags': [ '-march=armv8-a' ],
						'cflags_cc': [ '-march=armv8-a' ],
					}],
					['target_arch == "x64"', {
						'cflags': [ '-msse', '-msse2', '-mavx', '-mavx2', '-mfma' ],
						'cflags_cc': [ '-msse', '-msse2', '-mavx', '-mavx2', '-mfma' ],
					}],
				],
			}],
			['OS == "mac"', {
				'cflags': [ '-D_THREAD_SAFE' ],
				'cflags_cc': [ '-std=c++17', '-frtti', '-O3', '-flto', '-ffast-math', '-march=armv8-a', '-mtune=native' ],
				'ldflags': [ '-flto' ],
				'xcode_settings': {
				'OTHER_CFLAGS': [ '-std=c++17' ],
				'OTHER_CPLUSPLUSFLAGS': [ '-std=c++17', '-march=armv8-a', '-mtune=native' ],
				'GCC_ENABLE_CPP_RTTI': 'YES',
				'GCC_OPTIMIZATION_LEVEL': '3',
				'LLVM_LTO': 'YES',
			},
				'include_dirs': [
					'$(SDL_INC)',
					'/opt/X11/include',
				],
				'libraries': [ '-L$(SDL_LIB)', '-lSDL2' ],
				'link_settings': {
					'libraries': [ '-Wl,-rpath,@loader_path' ],
				},
			}],
			['OS == "win"', {
				'cflags': [ '-D_REENTRANT' ],
				'msvs_settings': {
					'VCCLCompilerTool': {
						'AdditionalOptions': [ '-std:c++17' ],
					'EnableEnhancedInstructionSet': '2',  # 2 = SSE2, 3 = AVX, 5 = AVX2
					},
				},
				'include_dirs': [ '<!(echo %SDL_INC%)' ],
				'libraries': [ '-l<!(echo %SDL_LIB%)\\SDL2.lib' ],
			}],
		],
	}],
}
