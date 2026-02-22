@echo off
REM Chronos History Diff App - Build and Package Script (Windows)

set "TARGET_ARCH=%1"

if "%TARGET_ARCH%"=="" goto display_help
if /i "%TARGET_ARCH%"=="help" goto display_help
if /i "%TARGET_ARCH%"=="-h" goto display_help
if /i "%TARGET_ARCH%"=="--help" goto display_help

REM If a valid ARCH is provided, continue with the build
goto continue_build

:display_help
echo Usage: package.bat [ARCH]
echo.
echo Builds and packages the Chronos History Diff App for Windows.
echo.
echo Arguments:
echo   ARCH    Specify the target architecture for Electron Builder.
echo           Common values:
echo           - x64     (64-bit Intel/AMD)
echo           - arm64   (64-bit ARM, e.g., Microsoft Surface Pro X)
echo           - ia32    (32-bit Intel/AMD)
echo           If no ARCH is provided, it defaults to x64.
echo.
echo Examples:
echo   package.bat          REM Builds for the host Windows architecture (e.g., arm64 on a Windows ARM VM, x64 on an x64 machine). This is the default if no ARCH is specified.
echo   package.bat --help   REM Display this help message
echo.
echo   REM Specific Architecture Builds for Windows:
echo   package.bat x64      REM Builds for Windows 64-bit Intel/AMD
echo   package.bat arm64    REM Builds for Windows 64-bit ARM (e.g., for Windows on ARM devices)
echo   package.bat ia32     REM Builds for Windows 32-bit Intel/AMD
exit /b 0

:continue_build
if "%TARGET_ARCH%"=="" set "TARGET_ARCH=x64"

REM Ensure clean build
echo Cleaning dist and out folders...
if exist dist rmdir /s /q dist
if exist out rmdir /s /q out

REM Build Next.js static export
echo Building Next.js application...
call npm run build -- --webpack

REM Package with Electron Builder
echo Packaging application...
call npx electron-builder --win --arch %TARGET_ARCH%

REM Show final size
echo Build complete! Checking final installer size:
dir dist\*.exe
dir dist\*.msi
pause
