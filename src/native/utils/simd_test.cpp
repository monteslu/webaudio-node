#include <iostream>

int main() {
#ifdef __ARM_NEON__
    std::cout << "ARM_NEON: YES" << std::endl;
#else
    std::cout << "ARM_NEON: NO" << std::endl;
#endif

#ifdef __ARM_NEON
    std::cout << "ARM_NEON (no underscore): YES" << std::endl;
#else
    std::cout << "ARM_NEON (no underscore): NO" << std::endl;
#endif

#ifdef __aarch64__
    std::cout << "aarch64: YES" << std::endl;
#else
    std::cout << "aarch64: NO" << std::endl;
#endif

#ifdef __AVX2__
    std::cout << "AVX2: YES" << std::endl;
#else
    std::cout << "AVX2: NO" << std::endl;
#endif

    return 0;
}
