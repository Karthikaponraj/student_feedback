@echo off
cd /d "%~dp0"
echo --- RESTARTING SERVER on PORT 5001 ---
set PORT=5001
echo Killing old node processes...
taskkill /F /IM node.exe /T 2>nul

echo Starting server...
npm start
pause
