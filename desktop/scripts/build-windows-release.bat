@echo off
setlocal
set "NODE=C:\Users\dell\nodejs"
set "CARGO=%USERPROFILE%\.cargo\bin"
set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

rem Keep PATH short before vcvars64 runs (avoids "input line is too long" on Windows).
set "PATH=%NODE%;%CARGO%;C:\Windows\System32;C:\Windows"

call "%VCVARS%" >nul
set "TAURI_PLATFORM=windows"
set "PATH=%NODE%;%CARGO%;%PATH%"

cd /d "%~dp0.."
echo Building frontend...
"%NODE%\npm.cmd" run build
if errorlevel 1 exit /b 1

echo Building Tauri release + NSIS installer...
"%NODE%\npx.cmd" tauri build --ci
exit /b %errorlevel%
