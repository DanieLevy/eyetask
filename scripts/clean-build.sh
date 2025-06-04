#!/bin/bash

echo "🧹 Starting fresh build process..."

# Remove build artifacts and caches
echo "🗑️  Cleaning build artifacts and caches..."
rm -rf .next
rm -rf node_modules
rm -rf .vercel
# Don't remove .netlify on Netlify builds to avoid breaking plugins
if [ -z "$NETLIFY" ]; then
  rm -rf .netlify
  echo "📂 Removed .netlify (local build)"
else
  echo "⏭️  Skipping .netlify removal (Netlify build)"
fi
rm -rf dist
rm -rf build
rm -rf .turbo

# Clear npm cache
echo "🧽 Clearing npm cache..."
npm cache clean --force

# Fresh install of dependencies
echo "📦 Installing fresh dependencies..."
npm ci --no-cache || npm install --no-cache

# Verify hooks directory exists
echo "🔍 Verifying hooks directory..."
if [ -d "hooks" ]; then
  echo "✅ hooks directory exists"
  ls -la hooks/
else
  echo "❌ hooks directory missing!"
  exit 1
fi

# Build the application
echo "🏗️  Building application..."
npm run build

echo "🎉 Fresh build completed successfully!"
echo "✨ Fresh deployment ready!" 