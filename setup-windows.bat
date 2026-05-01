@echo off
REM CollectionBuilder Website Development Setup Script for Windows
REM This script sets up Ruby, Bundler, and all dependencies for local development

echo.
echo ====================================
echo CollectionBuilder Setup for Windows
echo ====================================
echo.

REM Check if Ruby is installed
ruby --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Ruby is not installed or not in PATH
    echo Please download and install Ruby 3.3+ from: https://rubyinstaller.org/
    echo Make sure to check:
    echo   - "Add Ruby executables to your PATH"
    echo   - "Install MSYS2 development toolchain"  
    pause
    exit /b 1
)

echo [✓] Ruby detected
ruby --version

REM Check if Bundler is installed
bundle --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [!] Installing Bundler...
    gem install bundler
)

echo [✓] Bundler detected
bundle --version
echo.

REM Enable MSYS2 development tools
echo [*] Enabling MSYS2 development toolchain...
call C:\Ruby33-x64\bin\ridk enable

REM Navigate to project directory
if exist "Gemfile" (
    echo [✓] Found Gemfile in current directory
) else (
    echo [ERROR] Gemfile not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Clean previous installations
echo.
echo [*] Cleaning gem cache...
bundle clean --force

REM Install dependencies
echo [*] Running bundle install (this may take 5-10 minutes)...
bundle install

REM Verify installation
echo.
echo [*] Verifying installation...
bundle exec jekyll --version

if ERRORLEVEL 1 (
    echo [ERROR] Jekyll installation failed
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo ====================================
echo ✓ Setup Complete!
echo ====================================
echo.
echo To start the development server, run:
echo   bundle exec jekyll s
echo.
echo The site will be available at: http://127.0.0.1:4000
echo.
pause
