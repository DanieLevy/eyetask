const fs = require('fs');

// Read the feedbackService-supabase.ts file
const content = fs.readFileSync('lib/services/feedbackService-supabase.ts', 'utf8');

// Find the addInternalNote method signature
const match = content.match(/async addInternalNote\([^)]+\)/);
if (match) {
  console.log('Method signature found:', match[0]);
}

// Read the route file
const routeContent = fs.readFileSync('app/api/feedback/[id]/notes/route.ts', 'utf8');
console.log('\nRoute file snippet around addInternalNote:');
const lines = routeContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('addInternalNote')) {
    console.log(lines.slice(Math.max(0, i-5), i+5).join('\n'));
    break;
  }
}
