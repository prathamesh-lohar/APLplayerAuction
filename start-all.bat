@echo off
echo ================================================================
echo   Cricket Auction Engine - Quick Start (Windows)
echo ================================================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo WARNING: MongoDB may not be running!
    echo Please start MongoDB first if needed.
    echo.
    pause
)

REM Start backend
echo Starting backend server...
cd backend
if not exist "node_modules\" (
    echo Installing backend dependencies...
    call npm install
)

REM Create .env if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

start "Backend Server" cmd /k "npm start"
echo Backend started
cd ..
timeout /t 5 /nobreak >nul

REM Start Big Screen
echo Starting Big Screen...
cd big-screen
if not exist "node_modules\" (
    echo Installing big-screen dependencies...
    call npm install
)
start "Big Screen" cmd /k "npm start"
echo Big Screen started
cd ..
timeout /t 3 /nobreak >nul

REM Start Captain App
echo Starting Captain App...
cd captain-app
if not exist "node_modules\" (
    echo Installing captain-app dependencies...
    call npm install
)
start "Captain App" cmd /k "set PORT=3001 && npm start"
echo Captain App started
cd ..
timeout /t 3 /nobreak >nul

REM Start Admin Panel
echo Starting Admin Panel...
cd admin-panel
if not exist "node_modules\" (
    echo Installing admin-panel dependencies...
    call npm install
)
start "Admin Panel" cmd /k "set PORT=3002 && npm start"
echo Admin Panel started
cd ..
timeout /t 3 /nobreak >nul

REM Start Player Registration
echo Starting Player Registration...
cd player-registration
if not exist "node_modules\" (
    echo Installing player-registration dependencies...
    call npm install
)
start "Player Registration" cmd /k "set PORT=3003 && npm start"
echo Player Registration started
cd ..

echo.
echo ================================================================
echo   All services started successfully!
echo ================================================================
echo.
echo Access URLs:
echo   Backend:             http://localhost:5001
echo   Big Screen:          http://localhost:3000
echo   Captain App:         http://localhost:3001
echo   Admin Panel:         http://localhost:3002
echo   Player Registration: http://localhost:3003
echo.
echo Admin Login: admin123
echo.
echo Press any key to exit...
pause >nul
