@echo off
REM Simple build script for Oden
REM Usage: build.bat [platform]
REM Where platform is: linux, mac, windows, or all (default)

REM Default to all platforms if none specified
set PLATFORM=%1
if "%PLATFORM%"=="" set PLATFORM=all

echo Building Oden for platform: %PLATFORM%

REM Make sure build directory exists
if not exist build mkdir build

REM Run the Deno build script with all necessary permissions
deno run --allow-run --allow-read --allow-write --allow-env build\build.js %PLATFORM%

REM Check if build was successful
if %ERRORLEVEL% EQU 0 (
  echo ✅ Build completed successfully!
  echo Executables are available in the releases directory.
) else (
  echo ❌ Build failed!
  exit /b 1
)