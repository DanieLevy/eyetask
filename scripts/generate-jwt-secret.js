#!/usr/bin/env node

const crypto = require('crypto');

console.log('\n🔐 JWT Secret Generator for Drivers Hub Production Deployment\n');

// Generate a secure random string for JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('🔑 Generated JWT Secret:');
console.log('━'.repeat(80));
console.log(jwtSecret);
console.log('━'.repeat(80));

console.log('\n📋 Copy this to your Netlify environment variables:');
console.log(`JWT_SECRET=${jwtSecret}`);

console.log('\n📝 Instructions:');
console.log('1. Copy the JWT_SECRET line above');
console.log('2. Go to your Netlify Dashboard');
console.log('3. Navigate to: Site settings → Environment variables');
console.log('4. Add a new variable:');
console.log('   - Key: JWT_SECRET');
console.log('   - Value: (paste the secret above)');
console.log('5. Redeploy your site');
console.log('6. Clear browser cache and test image uploads');

console.log('\n✅ This should fix the 401 Unauthorized error for image uploads!\n'); 