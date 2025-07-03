const fs = require('fs');

// Read the route file
let content = fs.readFileSync('app/api/feedback/[id]/notes/route.ts', 'utf8');

// Fix the addInternalNote call
content = content.replace(
  /const noteId = await feedbackService\.addInternalNote\(\s*id,\s*noteDataWithAdmin\s*\);/,
  const noteId = await feedbackService.addInternalNote(
      id,
      noteData,
      adminName,
      adminId
    );
);

// Write back
fs.writeFileSync('app/api/feedback/[id]/notes/route.ts', content, 'utf8');

console.log('Fixed addInternalNote call in notes route');
