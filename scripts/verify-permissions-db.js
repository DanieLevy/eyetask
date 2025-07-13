const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPermissionsDatabase() {
  console.log('🔍 Verifying permissions database structure...\n');
  console.log('Connected to:', supabaseUrl);
  console.log('---\n');
  
  try {
    // 1. Check app_users table structure
    console.log('1. Checking app_users table...');
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, username, role, permission_overrides')
      .limit(5);
      
    if (usersError) {
      console.error('❌ Error reading app_users:', usersError.message);
    } else {
      console.log(`✅ app_users table accessible, found ${users.length} users`);
      if (users.length > 0) {
        console.log('   Sample user:', {
          username: users[0]?.username,
          role: users[0]?.role,
          hasPermissionOverrides: !!users[0]?.permission_overrides
        });
      }
    }
    
    // 2. Check role_permissions table
    console.log('\n2. Checking role_permissions table...');
    const { data: rolePerms, error: rolePermsError } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role');
      
    if (rolePermsError) {
      console.error('❌ Error reading role_permissions:', rolePermsError.message);
    } else {
      console.log(`✅ role_permissions table accessible, found ${rolePerms.length} entries`);
      
      // Check permissions for each role
      const roles = ['admin', 'data_manager', 'driver_manager'];
      for (const role of roles) {
        const rolePermCount = rolePerms.filter(p => p.role === role).length;
        console.log(`   ${role}: ${rolePermCount} permissions`);
      }
    }
    
    // 3. Check user_permissions table
    console.log('\n3. Checking user_permissions table...');
    const { data: userPerms, error: userPermsError } = await supabase
      .from('user_permissions')
      .select('*');
      
    if (userPermsError) {
      console.error('❌ Error reading user_permissions:', userPermsError.message);
    } else {
      console.log(`✅ user_permissions table accessible, found ${userPerms.length} entries`);
    }
    
    // 4. Verify specific user permissions
    console.log('\n4. Checking specific user permissions...');
    const { data: sagimUser, error: sagimError } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', 'sagim')
      .single();
      
    if (sagimError || !sagimUser) {
      console.log('   User "sagim" not found');
    } else {
      console.log(`\n   User 'sagim' details:`);
      console.log(`   - ID: ${sagimUser.id}`);
      console.log(`   - Role: ${sagimUser.role}`);
      console.log(`   - Permission overrides:`, sagimUser.permission_overrides || 'None');
      
      // Get all permissions for sagim
      const { data: sagimPerms, error: sagimPermsError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', sagimUser.id);
        
      if (!sagimPermsError && sagimPerms && sagimPerms.length > 0) {
        console.log(`   - User-specific permissions (${sagimPerms.length} total):`);
        
        // Group permissions by category
        const permissionsByCategory = {};
        sagimPerms.forEach(p => {
          const category = p.permission_key.split('.')[0];
          if (!permissionsByCategory[category]) {
            permissionsByCategory[category] = [];
          }
          permissionsByCategory[category].push(p);
        });
        
        Object.entries(permissionsByCategory).forEach(([category, perms]) => {
          console.log(`\n     ${category}:`);
          perms.forEach(p => {
            const icon = p.permission_value ? '✅' : '❌';
            console.log(`       ${icon} ${p.permission_key}`);
          });
        });
        
        // Check analytics permission specifically
        const hasAnalytics = sagimPerms.some(p => p.permission_key === 'access.analytics' && p.permission_value);
        console.log(`\n   - Has analytics permission: ${hasAnalytics ? '✅ Yes' : '❌ No'}`);
      } else {
        console.log('   - No user-specific permissions found');
      }
    }
    
    // 5. Test permission for admin user
    console.log('\n5. Checking admin user permissions...');
    const { data: adminUser } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', 'admin')
      .single();
      
    if (adminUser) {
      console.log(`   Admin user found: ${adminUser.username} (role: ${adminUser.role})`);
      
      const { data: adminPerms } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', adminUser.id);
        
      console.log(`   User-specific permissions: ${adminPerms?.length || 0}`);
      console.log('   Note: Admin role has all permissions by default');
    }
    
    console.log('\n✅ Database verification complete!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run the verification
verifyPermissionsDatabase().then(() => process.exit(0)); 