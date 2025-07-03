const fs = require('fs');

// Read the route file
let content = fs.readFileSync('app/api/feedback/[id]/notes/route.ts', 'utf8');

// Fix the addInternalNote call - find and replace
const oldCall = 'const noteId = await feedbackService.addInternalNote(\n      id,\n      noteDataWithAdmin\n    );';
const newCall = 'const noteId = await feedbackService.addInternalNote(\n      id,\n      noteData,\n      adminName,\n      adminId\n    );';

content = content.replace(oldCall, newCall);

// Write back
fs.writeFileSync('app/api/feedback/[id]/notes/route.ts', content, 'utf8');

console.log('Fixed addInternalNote call in notes route');
