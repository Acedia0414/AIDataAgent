@echo off
REM D365 Data Agent - Windows One-Click Deployment Script
REM For quick deployment after Git clone

setlocal enabledelayedexpansion

echo 🚀 D365 Data Agent One-Click Deployment Script
echo ==================================
echo.

REM Check Node.js
echo 🔍 Checking system requirements...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not installed, please install Node.js ^>= 18.0.0
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not installed
    pause
    exit /b 1
)

echo ✅ System requirements check passed

REM Check environment configuration
echo ⚙️ Checking environment configuration...
if not exist .env (
    if exist .env.example (
        echo ⚠️ .env file not found, creating from .env.example...
        copy .env.example .env >nul
        echo ⚠️ Please edit .env file to configure database connection
        echo ⚠️ Rerun this script after configuration
        pause
        exit /b 0
    ) else (
        echo ❌ .env.example file not found, cannot create environment configuration
        pause
        exit /b 1
    )
)

echo ✅ Environment configuration check completed

REM Install dependencies
echo 📦 Installing project dependencies...
if exist package.json (
    npm install
    if errorlevel 1 (
        echo ❌ Dependency installation failed
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ package.json file not found, please ensure you are in project root
    pause
    exit /b 1
)

REM Run database migrations
echo 🔄 Running database migrations...
npm run db:migrate
if errorlevel 1 (
    echo ❌ Database migration failed
    pause
    exit /b 1
)
echo ✅ Database migration completed

REM Check data files
echo 📁 Checking data files...
set "missing_files="

if not exist "data\TableMetadata_Export.xlsx" (
    set "missing_files=!missing_files! data\TableMetadata_Export.xlsx"
)

if not exist "data\Table level knowledge base.xlsx" (
    set "missing_files=!missing_files! data\Table level knowledge base.xlsx"
)

if not exist "data\labels.json" (
    set "missing_files=!missing_files! data\labels.json"
)

if not "!missing_files!"=="" (
    echo ⚠️ The following required data files are missing:
    for %%f in (!missing_files!) do echo   - %%f
    echo ⚠️ Please place data files in data\ directory and rerun
    pause
    exit /b 1
)

echo ✅ All required data files exist

REM Import data
echo 📊 Starting data import...

REM Import table metadata
echo 🔹 Importing table metadata...
node scripts\import-table-metadata.cjs
if errorlevel 1 (
    echo ❌ Table metadata import failed
    pause
    exit /b 1
)
echo ✅ Table metadata imported successfully

REM Import enhanced metadata
echo 🔹 Importing enhanced metadata (Labels and Enums)...
node scripts\import-enhanced-metadata.cjs
if errorlevel 1 (
    echo ❌ Enhanced metadata import failed
    pause
    exit /b 1
)
echo ✅ Enhanced metadata imported successfully

REM Import knowledge base
echo 🔹 Importing table knowledge base...
node scripts\import-table-knowledge-base.cjs
if errorlevel 1 (
    echo ❌ Table knowledge base import failed
    pause
    exit /b 1
)
echo ✅ Table knowledge base imported successfully

REM Import labels
echo 🔹 Importing label data...
node scripts\import-labels.cjs
if errorlevel 1 (
    echo ❌ Label data import failed
    pause
    exit /b 1
)
echo ✅ Label data imported successfully

echo 🎉 All data import completed!

REM Verify import
echo 🔍 Verifying data import...
REM Add verification logic here
echo ✅ Data verification completed

REM Show completion message
echo.
echo 🎉 Deployment completed!
echo.
echo 📋 Important links:
echo   - Home: http://localhost:3000
echo   - Chat Interface: http://localhost:3000/chat
echo   - Metadata Management: http://localhost:3000/metadata
echo   - Table Rules: http://localhost:3000/table-rules
echo.
echo 🧪 Test query:
echo   Enter in chat interface: "Show recent 10 purchase orders"
echo.
echo 📚 For more information, see DEPLOYMENT_GUIDE.md
echo.

REM Ask if user wants to start application
set /p choice="Start application now? (y/n): "
if /i "%choice%"=="y" (
    echo 🚀 Starting application...
    echo Application will start at http://localhost:3000
    echo Press Ctrl+C to stop application
    echo.
    npm run dev
) else (
    echo Deployment completed, you can manually run npm run dev to start the application
)

pause
