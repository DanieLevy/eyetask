#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Starting fresh build process...');

// Function to safely remove directories
function removeDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      console.log(`📂 Removing ${dirPath}...`);
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed ${dirPath}`);
    } else {
      console.log(`⏭️  ${dirPath} doesn't exist, skipping...`);
    }
  } catch (error) {
    console.log(`⚠️  Warning: Could not remove ${dirPath}:`, error.message);
  }
}

// Directories to clean (conditional .netlify removal)
const dirsToClean = [
  '.next',
  'node_modules',
  '.vercel',
  'dist',
  'build',
  '.turbo'
];

// Don't remove .netlify on Netlify builds to avoid breaking plugins
if (!process.env.NETLIFY) {
  dirsToClean.push('.netlify');
  console.log('🏠 Local build - will clean .netlify directory');
} else {
  console.log('☁️  Netlify build - preserving .netlify directory');
}

console.log('🗑️  Cleaning build artifacts and caches...');

// Remove all cache and build directories
dirsToClean.forEach(removeDirectory);

// Clear npm cache
console.log('🧽 Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ NPM cache cleared');
} catch (error) {
  console.log('⚠️  Warning: Could not clear npm cache:', error.message);
}

// Fresh install of dependencies
console.log('📦 Installing fresh dependencies...');
try {
  execSync('npm ci --no-cache', { stdio: 'inherit' });
  console.log('✅ Dependencies installed fresh');
} catch (error) {
  console.log('💡 npm ci failed, trying npm install...');
  try {
    execSync('npm install --no-cache', { stdio: 'inherit' });
    console.log('✅ Dependencies installed with npm install');
  } catch (installError) {
    console.error('❌ Failed to install dependencies:', installError.message);
    process.exit(1);
  }
}

// Verify hooks directory exists
console.log('🔍 Verifying hooks directory...');
if (fs.existsSync('hooks')) {
  console.log('✅ hooks directory exists');
  try {
    const hookFiles = fs.readdirSync('hooks');
    console.log('📁 Hook files found:', hookFiles.join(', '));
  } catch (error) {
    console.log('⚠️  Could not list hook files:', error.message);
  }
} else {
  console.error('❌ hooks directory missing!');
  process.exit(1);
}

// Build the application
console.log('🏗️  Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('🎉 Fresh build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('✨ Fresh deployment ready!'); 