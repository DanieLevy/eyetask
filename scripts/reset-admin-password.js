require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAdminPassword() {
  const newPassword = 'admin123'; // You can change this
  
  try {
    console.log('Resetting admin password...\n');
    
    // Find the admin user
    const { data: adminUser, error: findError } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (findError) {
      console.error('Error finding admin user:', findError);
      return;
    }
    
    if (!adminUser) {
      console.log('No admin user found');
      return;
    }
    
    console.log('Found admin user:');
    console.log('ID:', adminUser.id);
    console.log('Username:', adminUser.username);
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Active:', adminUser.is_active);
    console.log('\n');
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update the password
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ 
        password_hash: passwordHash,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', adminUser.id);
    
    if (updateError) {
      console.error('Error updating password:', updateError);
      return;
    }
    
    console.log('✅ Password reset successfully!');
    console.log('\nNew credentials:');
    console.log('Username:', adminUser.username);
    console.log('Password:', newPassword);
    console.log('\nYou can now login at http://localhost:3000/admin');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetAdminPassword();

