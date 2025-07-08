@echo off
echo 🚀 Starting Soccer Demo Server...
echo.

REM Try Python first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Using Python server
    python serve.py
    goto :end
)

REM Try Python3 if Python didn't work
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Using Python3 server
    python3 serve.py
    goto :end
)

REM Try Node.js if Python didn't work
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Using Node.js server
    node serve.js
    goto :end
)

REM If nothing worked, show instructions
echo ❌ Neither Python nor Node.js found!
echo.
echo Please install one of the following:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
echo Or use a simple HTTP server like:
echo   - Live Server extension in VS Code
echo   - http-server (npm install -g http-server)
echo.
pause

:end
