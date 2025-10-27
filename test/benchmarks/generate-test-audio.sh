#!/bin/bash

# Generate a 5-second test MP3 file with sine wave (440Hz A note)

echo "Generating test MP3 file..."

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg not found. Please install it:"
    echo "   brew install ffmpeg"
    exit 1
fi

# Generate 5 seconds of 440Hz sine wave as MP3
ffmpeg -f lavfi -i "sine=frequency=440:duration=5" -ac 2 -ab 128k -y test-audio.mp3 2>/dev/null

if [ -f "test-audio.mp3" ]; then
    echo "✅ Generated test-audio.mp3 (5 seconds, 440Hz sine wave)"
    ls -lh test-audio.mp3
else
    echo "❌ Failed to generate test-audio.mp3"
    exit 1
fi
