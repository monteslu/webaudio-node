#ifndef WEBAUDIO_LOGGER_H
#define WEBAUDIO_LOGGER_H

#include <string>
#include <iostream>
#include <sstream>
#include <ctime>

namespace webaudio {

enum class LogLevel {
	DEBUG,
	INFO,
	WARN,
	ERROR
};

class Logger {
public:
	static void SetLevel(LogLevel level) {
		current_level_ = level;
	}

	static LogLevel GetLevel() {
		return current_level_;
	}

	static void Debug(const std::string& message) {
		Log(LogLevel::DEBUG, message);
	}

	static void Info(const std::string& message) {
		Log(LogLevel::INFO, message);
	}

	static void Warn(const std::string& message) {
		Log(LogLevel::WARN, message);
	}

	static void Error(const std::string& message) {
		Log(LogLevel::ERROR, message);
	}

	static void Log(LogLevel level, const std::string& message) {
		if (level < current_level_) {
			return;
		}

		std::string level_str;
		switch (level) {
			case LogLevel::DEBUG: level_str = "[DEBUG]"; break;
			case LogLevel::INFO:  level_str = "[INFO] "; break;
			case LogLevel::WARN:  level_str = "[WARN] "; break;
			case LogLevel::ERROR: level_str = "[ERROR]"; break;
		}

		// Get timestamp
		std::time_t now = std::time(nullptr);
		char time_buf[32];
		std::strftime(time_buf, sizeof(time_buf), "%H:%M:%S", std::localtime(&now));

		std::cerr << time_buf << " " << level_str << " " << message << std::endl;
	}

private:
	static LogLevel current_level_;
};

// Helper macros
#define LOG_DEBUG(msg) webaudio::Logger::Debug(msg)
#define LOG_INFO(msg) webaudio::Logger::Info(msg)
#define LOG_WARN(msg) webaudio::Logger::Warn(msg)
#define LOG_ERROR(msg) webaudio::Logger::Error(msg)

} // namespace webaudio

#endif // WEBAUDIO_LOGGER_H
