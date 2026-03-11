#!/bin/bash
# Production Deployment Script for Frontend
# This script builds and prepares your frontend for production deployment

set -e

echo "🚀 Frontend Production Deployment Script"
echo "=========================================="
echo ""

# Step 1: Install dependencies (if needed)
echo "📦 Step 1: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
else
    echo "   Dependencies already installed ✓"
fi
echo ""

# Step 2: Build production
echo "🔨 Step 2: Building production version..."
npm run build
echo "   Build complete ✓"
echo ""

# Step 3: Check build size
echo "📊 Step 3: Build Size:"
du -sh dist/
echo ""

# Step 4: Git operations
echo "📝 Step 4: Git operations..."
git add .
echo "   Files staged ✓"
git commit -m "Production-ready frontend with Railway backend integration"
echo "   Changes committed ✓"
echo ""

# Step 5: Push to GitHub
echo "📤 Step 5: Pushing to GitHub..."
git push origin main
echo "   Pushed to GitHub ✓"
echo ""

echo "✅ Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Go to railway.app"
echo "2. Check Frontend service deployment status"
echo "3. Wait for build to complete (5-10 minutes)"
echo "4. Your frontend will be live at https://your-frontend-xxx.railway.app"
echo ""
echo "Backend URL: https://newkavya360-production.up.railway.app"
echo ""
