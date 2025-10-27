/* Opus config for WASM/Emscripten */
#ifndef CONFIG_H
#define CONFIG_H

#define OPUS_BUILD 1
#define VAR_ARRAYS 1
#define USE_ALLOCA 1

/* Disable custom modes */
#undef ENABLE_CUSTOM_MODES

/* Disable hardening */
#undef ENABLE_HARDENING

/* Disable assertions */
#define ENABLE_ASSERTIONS 0

/* Disable floating point API */
#undef DISABLE_FLOAT_API

/* Enable fixed point */
#undef FIXED_POINT

/* Enable intrinsics optimizations */
#undef OPUS_ARM_ASM
#undef OPUS_ARM_INLINE_ASM
#undef OPUS_ARM_INLINE_EDSP
#undef OPUS_ARM_INLINE_MEDIA
#undef OPUS_ARM_INLINE_NEON
#undef OPUS_ARM_MAY_HAVE_EDSP
#undef OPUS_ARM_MAY_HAVE_MEDIA
#undef OPUS_ARM_MAY_HAVE_NEON
#undef OPUS_ARM_MAY_HAVE_NEON_INTR
#undef OPUS_ARM_PRESUME_EDSP
#undef OPUS_ARM_PRESUME_MEDIA
#undef OPUS_ARM_PRESUME_NEON
#undef OPUS_ARM_PRESUME_NEON_INTR
#undef OPUS_HAVE_RTCD
#undef OPUS_X86_MAY_HAVE_SSE
#undef OPUS_X86_MAY_HAVE_SSE2
#undef OPUS_X86_MAY_HAVE_SSE4_1
#undef OPUS_X86_MAY_HAVE_AVX
#undef OPUS_X86_PRESUME_SSE
#undef OPUS_X86_PRESUME_SSE2
#undef OPUS_X86_PRESUME_SSE4_1
#undef OPUS_X86_PRESUME_AVX

/* Package info */
#define PACKAGE "opus"
#define PACKAGE_NAME "opus"
#define PACKAGE_VERSION "1.5.2"
#define VERSION "1.5.2"

#endif /* CONFIG_H */
