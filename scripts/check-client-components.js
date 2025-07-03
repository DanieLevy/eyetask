#!/usr/bin/env node

/**
 * Script to check for common Client Component issues
 * Specifically looks for async/await usage in Client Components
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Checking for async/await issues in Client Components...\n');

let issuesFound = 0;

// Find all TypeScript/JavaScript files
const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
  ignore: ['node_modules/**', '.next/**', 'out/**', 'scripts/**']
});

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check if it's a Client Component
  if (content.includes('"use client"') || content.includes("'use client'")) {
    // Check for async function declarations that look like components
    const asyncComponentRegex = /export\s+(default\s+)?async\s+function\s+\w*Page|export\s+(default\s+)?async\s+function\s+\w*Component/g;
    const asyncArrowRegex = /export\s+(default\s+)?const\s+\w*(?:Page|Component)\s*=\s*async/g;
    
    if (asyncComponentRegex.test(content) || asyncArrowRegex.test(content)) {
      console.log(`❌ Found async Client Component in: ${file}`);
      issuesFound++;
      
      // Try to find the specific line
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.match(asyncComponentRegex) || line.match(asyncArrowRegex)) {
          console.log(`   Line ${index + 1}: ${line.trim()}`);
        }
      });
      console.log('');
    }
    
    // Check for awaiting params in Client Components
    if (content.includes('await params')) {
      console.log(`⚠️  Found 'await params' in Client Component: ${file}`);
      console.log('   Consider using useParams() hook instead\n');
      issuesFound++;
    }
  }
});

if (issuesFound === 0) {
  console.log('✅ No async/await issues found in Client Components!');
} else {
  console.log(`\n🚨 Found ${issuesFound} potential issue${issuesFound > 1 ? 's' : ''}`);
  console.log('\nRefer to docs/DEVELOPMENT_GUIDELINES.md for best practices.');
  process.exit(1);
} 