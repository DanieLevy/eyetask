// Script to create initial admin user
// Run with: node scripts/create-admin-user.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

async function checkExistingAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('Missing Supabase environment variables');
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { data: adminUser, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking for existing admin:', error);
      return null;
    }

    return adminUser;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function createAdminUser() {
  // First check if admin already exists
  const existingAdmin = await checkExistingAdmin();
  
  if (existingAdmin) {
    console.log('❌ Admin user already exists!');
    console.log('\nExisting admin details:');
    console.log('Username:', existingAdmin.username);
    console.log('Email:', existingAdmin.email);
    console.log('Role:', existingAdmin.role);
    console.log('\nIf you need to reset the password, run:');
    console.log('node scripts/reset-admin-password.js');
    return;
  }

  const adminData = {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123' // Change this to a secure password!
  };

  console.log('Creating admin user...');
  console.log('Username:', adminData.username);
  console.log('Email:', adminData.email);
  console.log('Password:', adminData.password);
  console.log('\n⚠️  Please change the password after first login!\n');

  try {
    const response = await fetch('http://localhost:3000/api/auth/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Admin user created successfully!');
      console.log('User ID:', result.user.id);
      console.log('Token:', result.token);
      console.log('\nYou can now login with these credentials at http://localhost:3000/admin');
    } else {
      console.error('❌ Failed to create admin user:', result.error);
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.log('\nMake sure the development server is running (npm run dev)');
  }
}

// Run the function
createAdminUser(); 