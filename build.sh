#!/bin/bash
# Simple build script for Oden
# Usage: ./build.sh [platform]
# Where platform is: linux, mac, windows, or all (default)

# Default to all platforms if none specified
PLATFORM=${1:-all}

echo "Building Oden for platform: $PLATFORM"

# Make sure build directory exists
mkdir -p build

# Make this script executable if it isn't already
chmod +x build.sh

# Run the Deno build script with all necessary permissions
deno run --allow-run --allow-read --allow-write --allow-env build/build.js $PLATFORM

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Build completed successfully!"
  echo "Executables are available in the releases directory."
else
  echo "❌ Build failed!"
  exit 1
fi