#include "logger.h"
#include <cstdlib>

namespace webaudio {

// Default to WARN level (can be changed via LOG_LEVEL environment variable)
LogLevel Logger::current_level_ = []() {
	const char* env_level = std::getenv("WEBAUDIO_LOG_LEVEL");
	if (env_level) {
		std::string level(env_level);
		if (level == "DEBUG") return LogLevel::DEBUG;
		if (level == "INFO")  return LogLevel::INFO;
		if (level == "WARN")  return LogLevel::WARN;
		if (level == "ERROR") return LogLevel::ERROR;
	}
	return LogLevel::WARN;  // Default
}();

} // namespace webaudio
