#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all TypeScript files in the API directory
function findApiFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findApiFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Update imports in a file
function updateFileImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip if already using database-selector
  if (content.includes('@/lib/database-selector')) {
    return false;
  }
  
  // Replace database imports
  if (content.includes("from '@/lib/database'")) {
    // Handle db imports
    content = content.replace(
      /import\s*\{\s*db\s*\}\s*from\s*['"]@\/lib\/database['"]/g,
      "import { db } from '@/lib/database-selector'"
    );
    
    // Handle other imports from database
    content = content.replace(
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@\/lib\/database['"]/g,
      (match, imports) => {
        const importList = imports.split(',').map(i => i.trim());
        const dbImports = [];
        const typeImports = [];
        
        importList.forEach(imp => {
          if (imp === 'db') {
            dbImports.push('db');
          } else if (imp.includes('type ')) {
            typeImports.push(imp);
          } else if (['getHomepageData', 'getProjectPageData', 'updateSubtaskVisibility'].includes(imp)) {
            // These are now methods on db, skip
          } else {
            typeImports.push(imp);
          }
        });
        
        let result = '';
        if (dbImports.length > 0) {
          result = "import { db } from '@/lib/database-selector'";
        }
        if (typeImports.length > 0) {
          if (result) result += ';\n';
          result += `import { ${typeImports.join(', ')} } from '@/lib/database'`;
        }
        return result || match;
      }
    );
    
    // Update function calls
    content = content.replace(/\bgetHomepageData\(\)/g, 'db.getHomepageData()');
    content = content.replace(/\bgetProjectPageData\(/g, 'db.getProjectPageData(');
    content = content.replace(/\bupdateSubtaskVisibility\(/g, 'db.updateSubtaskVisibility(');
    
    // Handle single function imports like updateSubtaskVisibility
    content = content.replace(
      /import\s*\{\s*updateSubtaskVisibility\s*\}\s*from\s*['"]@\/lib\/database['"]/g,
      ''
    );
    
    modified = true;
  }
  
  // Replace auth imports
  if (content.includes("from '@/lib/auth'")) {
    // Simple replacements
    content = content.replace(
      /import\s*\{\s*auth\s*\}\s*from\s*['"]@\/lib\/auth['"]/g,
      "import { authService } from '@/lib/database-selector'"
    );
    
    content = content.replace(
      /import\s*\{\s*auth\s*,\s*requireAdmin\s*\}\s*from\s*['"]@\/lib\/auth['"]/g,
      "import { authService, requireAdmin } from '@/lib/database-selector'"
    );
    
    // Complex auth imports
    content = content.replace(
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@\/lib\/auth['"]/g,
      (match, imports) => {
        const importList = imports.split(',').map(i => i.trim());
        const selectorImports = [];
        const authImports = [];
        
        importList.forEach(imp => {
          if (imp === 'auth' || imp === 'AuthService') {
            selectorImports.push('authService');
          } else if (imp === 'requireAdmin') {
            selectorImports.push('requireAdmin');
          } else {
            authImports.push(imp);
          }
        });
        
        let result = '';
        if (selectorImports.length > 0) {
          result = `import { ${[...new Set(selectorImports)].join(', ')} } from '@/lib/database-selector'`;
        }
        if (authImports.length > 0) {
          if (result) result += ';\n';
          result += `import { ${authImports.join(', ')} } from '@/lib/auth'`;
        }
        return result || match;
      }
    );
    
    // Update auth usage
    content = content.replace(/\bauth\.extractUserFromRequest\(/g, 'authService.extractUserFromRequest(');
    content = content.replace(/\bAuthService\.extractUserFromRequest\(/g, 'authService.extractUserFromRequest(');
    content = content.replace(/\bauth\.isAdmin\(/g, 'authService.isAdmin(');
    content = content.replace(/\bAuthService\.isAdmin\(/g, 'authService.isAdmin(');
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return modified;
}

// Main function
function main() {
  console.log('🔄 Updating all imports to use database-selector...\n');
  
  const apiDir = path.join(__dirname, '..', 'app', 'api');
  const files = findApiFiles(apiDir);
  
  let updatedCount = 0;
  const errors = [];
  
  for (const file of files) {
    try {
      if (updateFileImports(file)) {
        console.log(`✅ Updated: ${path.relative(process.cwd(), file)}`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`❌ Error updating ${file}:`, error.message);
      errors.push({ file, error: error.message });
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total files: ${files.length}`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Files with errors:');
    errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }
  
  console.log('\n✨ Import update complete!');
}

// Run the script
main(); 