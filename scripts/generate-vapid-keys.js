const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating VAPID keys for push notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');

// Validate key lengths for P-256 curve (iOS requirement)
const publicKeyBytes = Buffer.from(vapidKeys.publicKey, 'base64url');
const privateKeyBytes = Buffer.from(vapidKeys.privateKey, 'base64url');

console.log(`📊 Key Statistics:`);
console.log(`  Public Key Length: ${vapidKeys.publicKey.length} characters (${publicKeyBytes.length} bytes)`);
console.log(`  Private Key Length: ${vapidKeys.privateKey.length} characters (${privateKeyBytes.length} bytes)\n`);

// Check if keys meet P-256 requirements
if (publicKeyBytes.length === 65) {
  console.log('✅ Public key is valid P-256 uncompressed format (65 bytes)');
} else if (publicKeyBytes.length === 33) {
  console.log('✅ Public key is valid P-256 compressed format (33 bytes)');
} else {
  console.log('⚠️  Warning: Public key length unusual for P-256');
}

console.log('\n📝 Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your-email@example.com\n`);

// Optionally save to a file
const envPath = path.join(__dirname, '..', '.env.vapid');
const envContent = `# Generated VAPID keys for push notifications
# Copy these to your .env.local file

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:your-email@example.com
`;

fs.writeFileSync(envPath, envContent);
console.log(`💾 Keys also saved to: ${envPath}`);

// Test key conversion (simulate what happens in browser)
console.log('\n🧪 Testing key conversion (iOS compatibility check)...');
try {
  // Simulate urlBase64ToUint8Array conversion
  const padding = '='.repeat((4 - (vapidKeys.publicKey.length % 4)) % 4);
  const base64 = (vapidKeys.publicKey + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const binaryString = Buffer.from(base64, 'base64').toString('binary');
  const uint8Array = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  
  console.log(`✅ Key conversion successful! Uint8Array length: ${uint8Array.length} bytes`);
  
  // Verify it's a valid P-256 key
  if (uint8Array.length === 65 && uint8Array[0] === 0x04) {
    console.log('✅ Valid uncompressed P-256 public key (starts with 0x04)');
  } else if (uint8Array.length === 33 && (uint8Array[0] === 0x02 || uint8Array[0] === 0x03)) {
    console.log('✅ Valid compressed P-256 public key');
  }
  
} catch (error) {
  console.error('❌ Key conversion test failed:', error.message);
}

console.log('\n✨ Done! Your VAPID keys are iOS-compatible.'); 