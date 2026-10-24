@echo off
rem Starts the Reading Journey app and opens it in Google Chrome (needed for the reading check).
cd /d "%~dp0"
start "Reading Journey (keep open)" /min python tools\serve.py 8321
timeout /t 2 /nobreak >nul
set URL=http://localhost:8321
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %URL%
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" %URL%
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" %URL%
) else (
  start "" %URL%
)
