# Simple restart script for Jekyll/Docker Compose
# Run from the workspace root directory

Write-Host "[*] Restarting petrosylvania-collection-builder service..." -ForegroundColor Cyan

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if Docker Desktop is running
$dockerProcess = Get-Process -Name "Docker" -ErrorAction SilentlyContinue
if (-not $dockerProcess) {
    Write-Host "[!] Docker Desktop is not running. Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker.exe"
    
    # Wait for Docker to be ready
    Write-Host "[*] Waiting for Docker to initialize (up to 30 seconds)..." -ForegroundColor Yellow
    $dockerReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $null = docker ps
            Write-Host "[+] Docker is ready!" -ForegroundColor Green
            $dockerReady = $true
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    
    if (-not $dockerReady) {
        Write-Host "[!] Docker failed to start within 30 seconds. Continuing anyway..." -ForegroundColor Yellow
    }
}

# Stop containers
Write-Host "[>] Stopping containers..." -ForegroundColor Yellow
docker-compose -f "$projectPath\docker-compose.yml" down

# Brief pause to ensure clean shutdown
Start-Sleep -Seconds 2

# Start containers
Write-Host "[>] Starting containers..." -ForegroundColor Yellow
docker-compose -f "$projectPath\docker-compose.yml" up -d

# Wait for Jekyll to be ready
Write-Host "[*] Waiting for Jekyll to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check status
Write-Host "[-] Checking status..." -ForegroundColor Cyan
docker-compose -f "$projectPath\docker-compose.yml" ps

Write-Host "[+] Service restart complete!" -ForegroundColor Green
Write-Host "[*] Access the site at: http://localhost:4000" -ForegroundColor Green
