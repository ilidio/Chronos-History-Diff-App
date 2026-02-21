@echo off
REM Chronos History Diff App - Build and Package Script (Windows)

REM Ensure clean build
echo Cleaning dist and out folders...
if exist dist rmdir /s /q dist
if exist out rmdir /s /q out

REM Build Next.js static export
echo Building Next.js application...
call npm run build -- --webpack

REM Package with Electron Builder
echo Packaging application...
call npx electron-builder

REM Show final size
echo Build complete! Checking final installer size:
dir dist\*.exe
dir dist\*.msi
pause
