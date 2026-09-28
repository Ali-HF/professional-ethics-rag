@echo off
setlocal enabledelayedexpansion
title Ethica · Professional Ethics Midterm Prep
color 0A

echo ====================================================================
echo   Ethica - CT-268 Professional Ethics Midterm Prep Assistant
echo   NED University of Engineering ^& Technology
echo ====================================================================
echo.

:: 1. Verify Python Installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python is not found on your system!
        echo Please download and install Python 3.11+ from https://www.python.org/downloads/
        echo Make sure to check "Add Python to PATH" during installation.
        pause
        exit /b 1
    ) else (
        set PY_CMD=py
    )
) else (
    set PY_CMD=python
)

:: 2. Check / Create Virtual Environment
if not exist "venv\Scripts\activate.bat" (
    echo [*] Setting up virtual environment...
    %PY_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

:: 3. Activate Virtual Environment
call venv\Scripts\activate.bat

:: 4. Install / Verify Dependencies
echo [*] Checking and installing dependencies (first time may take ~1 min)...
pip install -r requirements.txt --quiet --disable-pip-version-check

:: 5. Check or Prompt for Groq API Key
set NEED_KEY=1
if exist ".env" (
    for /f "usebackq delims=" %%A in (".env") do (
        set "line=%%A"
        if not "!line:GROQ_API_KEY=gsk_!"=="!line!" (
            if "!line:gsk_...=!"=="!line!" (
                set NEED_KEY=0
            )
        )
    )
)

if "!NEED_KEY!"=="1" (
    echo.
    echo --------------------------------------------------------------------
    echo   [!] Groq API Key Required (100%% Free, no credit card needed)
    echo   Get your free key here: https://console.groq.com/keys
    echo --------------------------------------------------------------------
    set /p "INPUT_KEY=Paste your Groq API Key (starts with gsk_): "
    if "!INPUT_KEY!"=="" (
        echo [!] You can also set your key directly in the web app.
    ) else (
        echo GROQ_API_KEY="!INPUT_KEY!" > .env
        echo [*] Groq API Key saved to .env!
    )
)

:: 6. Check / Ingest Vector Database
if not exist "chroma_db" (
    echo [*] Indexing course slides into local vector database...
    python ingest_database.py
)

:: 7. Launch App & Open Browser
echo.
echo ====================================================================
echo   Starting web application at http://localhost:7860
echo ====================================================================
start "" "http://localhost:7860"
python server.py

pause
