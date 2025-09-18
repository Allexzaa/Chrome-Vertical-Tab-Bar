@echo off
REM Chrome Vertical Tab Bar - Build and Run Script
REM This script is called by start-tab-bar-silent.vbs for silent execution

REM Change to the script's directory
cd /d "%~dp0"

REM Build the application
call npm run build >nul 2>&1

REM Check if build was successful
if %errorlevel% neq 0 (
    echo Build failed! Please run 'npm install' first.
    exit /b 1
)

REM Copy assets to dist folder
xcopy /E /I /Y src\renderer\assets dist\renderer\assets >nul 2>&1

REM Start the Electron application
call npm start

REM Exit cleanly
exit /b 0