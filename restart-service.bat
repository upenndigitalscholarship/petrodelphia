@echo off
REM Simple restart script for Jekyll/Docker Compose (Windows batch)

echo.
echo [*] Restarting petrosylvania-collection-builder service...
echo.

REM Get current directory
set "projectPath=%~dp0"

echo [*] Checking if Docker Desktop is running...
docker ps >NUL 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] Docker Desktop does not appear to be running.
    echo [!] Please start Docker Desktop manually and try again.
    echo.
    pause
    exit /b 1
)

echo [+] Docker is ready.
echo.
echo [>] Stopping containers...
docker-compose -f "%projectPath%docker-compose.yml" down

REM Brief pause to ensure clean shutdown
timeout /t 2 /nobreak

echo.
echo [>] Starting containers...
docker-compose -f "%projectPath%docker-compose.yml" up -d

REM Wait for Jekyll to be ready
echo.
echo [*] Waiting for Jekyll to initialize...
timeout /t 5 /nobreak

REM Check status
echo.
echo [-] Checking status...
docker-compose -f "%projectPath%docker-compose.yml" ps

echo.
echo [+] Service restart complete!
echo [*] Access the site at: http://localhost:4000
echo.
pause
