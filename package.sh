#!/bin/bash
# Chronos History Diff App - Generic Build and Package Script

# --- Helper Functions ---

# Function to detect the host OS and architecture
get_host_os_and_arch() {
  HOST_OS=""
  HOST_ARCH=""

  # Detect OS
  case "$(uname -s)" in
    Linux*)     HOST_OS="linux";;
    Darwin*)    HOST_OS="mac";;
    CYGWIN*|MINGW*|MSYS*) HOST_OS="win";; # Git Bash / MSYS2 on Windows
    *)          HOST_OS="unknown"
  esac

  # Detect Architecture
  case "$(uname -m)" in
    x86_64)     HOST_ARCH="x64";;
    arm64)      HOST_ARCH="arm64";; # macOS ARM
    aarch64)    HOST_ARCH="arm64";; # Linux ARM
    i386|i686)  HOST_ARCH="ia32";;
    *)          HOST_ARCH="unknown"
  esac

  echo "Detected host OS: $HOST_OS, host architecture: $HOST_ARCH"
}


# Function to display help message
display_help() {
  echo "Usage: ./package.sh [TARGET_OS] [TARGET_ARCH]"
  echo ""
  echo "Builds and packages the Chronos History Diff App for the specified operating system and architecture."
  echo ""
  echo "Arguments:"
  echo "  TARGET_OS    Specify the target operating system."
  echo "               Possible values: win, mac, linux."
  echo "               Defaults to the host OS if not provided."
  echo ""
  echo "  TARGET_ARCH  Specify the target architecture."
  echo "               Possible values: x64, arm64, ia32."
  echo "               Defaults to the host architecture if not provided."
  echo ""
  echo "Examples:"
  echo "  ./package.sh                 # Builds for host OS and host architecture (e.g., mac arm64 on an M-series Mac)"
  echo "  ./package.sh --help          # Display this help message"
  echo ""
  echo "  # Specific OS and Architecture combinations:"
  echo "  ./package.sh mac arm64       # Builds for macOS ARM64 (Apple Silicon)"
  echo "  ./package.sh win x64         # Builds for Windows x64 (typical desktop)"
  echo "  ./package.sh linux arm64     # Builds for Linux ARM64 (e.g., Raspberry Pi)"
  echo "  ./package.sh win ia32        # Builds for Windows 32-bit"
  echo ""
  echo "  # Specific OS, let architecture default to host's:"
  echo "  ./package.sh mac             # Builds for macOS (e.g., arm64 on an M-series Mac, x64 on an Intel Mac)"
  echo "  ./package.sh win             # Builds for Windows (e.g., arm64 on a Windows ARM VM, x64 on a Windows x64 machine)"
  echo "  ./package.sh linux           # Builds for Linux (e.g., arm64 on a Linux ARM device, x64 on a Linux x64 machine)"
  echo ""
  echo "Cross-compilation Notes:"
  echo "  - Building for 'mac' target typically requires running on a macOS host."
  echo "  - Building for 'win' target from Linux/macOS may require 'wine' for specific features (e.g., code signing)."
  echo "  - Building for 'linux' target generally works from any host."
  exit 0
}

# --- Main Script Logic ---

# Check for macOS Xcode license if on mac
if [[ "$(uname -s)" == "Darwin"* ]]; then
    if ! xcodeselect_output=$(/usr/bin/xcrun clang 2>&1) && echo "$xcodeselect_output" | grep -q "license"; then
        echo "❌ ERROR: Xcode license not accepted."
        echo "Please run: sudo xcodebuild -license"
        exit 1
    fi
fi

# Check for help flag
if [[ "$1" == "help" || "$1" == "-h" || "$1" == "--help" ]]; then
  display_help
fi

# Detect host OS and architecture for defaults
get_host_os_and_arch
DEFAULT_OS="$HOST_OS"
DEFAULT_ARCH="$HOST_ARCH"

# Parse arguments
TARGET_OS="${1:-$DEFAULT_OS}" # Use first arg or default to host OS
TARGET_ARCH="${2:-$DEFAULT_ARCH}" # Use second arg or default to host architecture

# If no arguments were given, and defaults are 'unknown', display help
if [[ "$#" -eq 0 && ("$DEFAULT_OS" == "unknown" || "$DEFAULT_ARCH" == "unknown") ]]; then
  echo "Error: Could not determine host OS or architecture. Please specify TARGET_OS and TARGET_ARCH."
  display_help
fi

echo "Building for target OS: $TARGET_OS, target architecture: $TARGET_ARCH"

# Ensure clean build (only out/, as dist/ will be used as a temporary staging area)
echo "Cleaning out folder..."
rm -rf out/

# Build Next.js application
echo "Building Next.js application..."
npm run build -- --webpack || { echo "Next.js build failed. Exiting."; exit 1; }

# Package with Electron Builder
echo "Packaging application with Electron Builder..."
# First, ensure the temporary 'dist' folder is clean for this build process
rm -rf dist/
mkdir -p dist/ # Create it so electron-builder has a place to put its temporary files

BUILDER_CMD="npx electron-builder"

case "$TARGET_OS" in
  win)   BUILDER_CMD+=" --win";;
  mac)   BUILDER_CMD+=" --mac";;
  linux) BUILDER_CMD+=" --linux";;
  *)     echo "Error: Unsupported TARGET_OS '$TARGET_OS'. Exiting."; exit 1;;
esac

case "$TARGET_ARCH" in
  x64) BUILDER_CMD+=" --x64";;
  arm64) BUILDER_CMD+=" --arm64";;
  ia32) BUILDER_CMD+=" --ia32";;
  *)              echo "Error: Unsupported TARGET_ARCH '$TARGET_ARCH'. Exiting."; exit 1;;
esac

eval "$BUILDER_CMD" || { echo "Electron Builder packaging failed. Exiting."; exit 1; }

# Archive the build artifacts
ARCHIVE_DIR="dist_archive/${TARGET_OS}-${TARGET_ARCH}"
echo "Archiving build artifacts to $ARCHIVE_DIR..."
# Clean the specific archive directory first to avoid "Directory not empty" errors on mv
rm -rf "$ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR"
mv dist/* "$ARCHIVE_DIR/" || { echo "Failed to archive build artifacts."; exit 1; }
rm -rf dist/ # Clean up the temporary dist folder

# Show final size (from the archived directory)
echo "Build complete! Checking final installer sizes in $ARCHIVE_DIR/:"
case "$TARGET_OS" in
  win)   ls -lh "$ARCHIVE_DIR"/*.exe "$ARCHIVE_DIR"/*.msi 2>/dev/null || du -sh "$ARCHIVE_DIR" ;;
  mac)   ls -lh "$ARCHIVE_DIR"/*.dmg "$ARCHIVE_DIR"/*.pkg 2>/dev/null || du -sh "$ARCHIVE_DIR" ;;
  linux) ls -lh "$ARCHIVE_DIR"/*.AppImage "$ARCHIVE_DIR"/*.deb "$ARCHIVE_DIR"/*.rpm 2>/dev/null || du -sh "$ARCHIVE_DIR" ;;
  *)     echo "Unknown target OS, cannot list specific installers. Showing general archive size:"; du -sh "$ARCHIVE_DIR" ;;
esac

echo "Done."
