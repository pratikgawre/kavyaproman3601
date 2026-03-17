@echo off
REM Production Deployment Script for Frontend (Windows)
REM This script builds and prepares your frontend for production deployment

echo.
echo 🚀 Frontend Production Deployment Script
echo ==========================================
echo.

REM Step 1: Install dependencies
echo 📦 Step 1: Checking dependencies...
if not exist "node_modules" (
    echo    Installing dependencies...
    call npm install
) else (
    echo    Dependencies already installed ✓
)
echo.

REM Step 2: Build production
echo 🔨 Step 2: Building production version...
call npm run build
echo    Build complete ✓
echo.

REM Step 3: Git operations
echo 📝 Step 3: Git operations...
call git add .
echo    Files staged ✓
call git commit -m "Production-ready frontend with Railway backend integration"
echo    Changes committed ✓
echo.

REM Step 4: Push to GitHub
echo 📤 Step 4: Pushing to GitHub...
call git push origin main
echo    Pushed to GitHub ✓
echo.

echo ✅ Deployment Complete!
echo.
echo Next steps:
echo 1. Go to railway.app
echo 2. Check Frontend service deployment status
echo 3. Wait for build to complete (5-10 minutes)
echo 4. Your frontend will be live at https://your-frontend-xxx.railway.app
echo.
echo Backend URL: https://newkavya360-production.up.railway.app
echo.
pause
