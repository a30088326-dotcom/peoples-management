@echo off
echo ===================================================
echo     Starting ReadyHR System (Backend + Desktop App)
echo ===================================================
echo.

echo [0/2] Cleaning up old processes...
:: Kill processes on port 3001 (Backend) and 5174 (Frontend)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3001') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >nul 2>&1
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :5174') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >nul 2>&1
)

:: Start the Backend Server in background
start /B cmd /c "cd backend && npm run dev"

:: Wait a few seconds to let the backend initialize
timeout /t 3 /nobreak > nul

:: Start the Frontend / Electron App in the current window
echo [2/2] Starting Desktop App...
cd frontend && npm run dev:electron
