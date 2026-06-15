@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ========================================
echo  boss-jobpilot one-click startup
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Please install Node.js 24 or newer, then run this file again.
  echo Download: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where corepack >nul 2>nul
if errorlevel 1 (
  echo Corepack was not found.
  echo Please reinstall Node.js 24 or newer, then run this file again.
  echo.
  pause
  exit /b 1
)

echo Checking dependencies...
if not exist "%ROOT%node_modules" (
  echo node_modules was not found. Installing dependencies now...
  call corepack pnpm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    echo Check the error above, then run start.bat again.
    echo.
    pause
    exit /b 1
  )
) else (
  echo Dependencies already installed.
)

echo.
echo Building browser extension...
if not exist "%ROOT%.tmp" mkdir "%ROOT%.tmp"
set "CI=1"
set "NO_UPDATE_NOTIFIER=1"
call corepack pnpm --filter @boss-jobpilot/extension build > "%ROOT%.tmp\extension-build.log" 2>&1
if errorlevel 1 (
  echo.
  echo Browser extension build failed.
  echo Build log:
  type "%ROOT%.tmp\extension-build.log"
  echo.
  echo Check the error above, then run start.bat again.
  echo.
  pause
  exit /b 1
)
echo Browser extension build completed.

if "%~1"=="--check" (
  echo Startup script check passed.
  exit /b 0
)

echo.
echo Starting local API at http://127.0.0.1:4000
start "boss-jobpilot API" cmd /k "pushd ""%ROOT%"" && corepack pnpm --filter @boss-jobpilot/api dev"

echo Starting web app at http://127.0.0.1:5173 and http://localhost:5173
start "boss-jobpilot Web" cmd /k "pushd ""%ROOT%"" && corepack pnpm --filter @boss-jobpilot/web dev"

echo.
echo Waiting a few seconds before opening the browser...
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Startup commands have been launched.
echo Keep the API and Web terminal windows open while using the app.
echo Close those windows to stop the project.
echo.
echo Browser extension has been built at:
echo %ROOT%apps\extension\build\chrome-mv3-prod
echo Load this folder manually in Chrome or Edge extension settings.
echo.
pause
