#!/bin/bash

echo "🧹 Starting fresh build process..."

# Remove build artifacts and caches
echo "🗑️  Cleaning build artifacts and caches..."
rm -rf .next
rm -rf node_modules
rm -rf .vercel
rm -rf .netlify
rm -rf dist
rm -rf build
rm -rf .turbo

# Clear npm cache
echo "🧽 Clearing npm cache..."
npm cache clean --force

# Fresh install of dependencies
echo "📦 Installing fresh dependencies..."
npm ci --no-cache || npm install --no-cache

# Build the application
echo "🏗️  Building application..."
npm run build

echo "🎉 Fresh build completed successfully!"
echo "✨ Fresh deployment ready!" 