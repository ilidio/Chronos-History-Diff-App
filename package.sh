#!/bin/bash
# Chronos History Diff App - Build and Package Script (macOS/Linux)

# Ensure clean build
echo "Cleaning dist folder..."
rm -rf dist/
rm -rf out/

# Build Next.js static export
echo "Building Next.js application..."
npm run build -- --webpack

# Package with Electron Builder
echo "Packaging application..."
npx electron-builder

# Show final size
echo "Build complete! Checking final installer sizes in dist/:"
ls -lh dist/*.dmg dist/*.pkg dist/*.AppImage dist/*.deb dist/*.rpm 2>/dev/null || du -sh dist/
