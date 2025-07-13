const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncUserPermissions() {
  console.log('🔄 Starting user permissions synchronization...\n');

  try {
    // 1. Get all users
    console.log('1. Fetching all users...');
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, username, role, permission_overrides');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} users\n`);

    // 2. Get all role permissions
    console.log('2. Fetching role permissions...');
    const { data: rolePermissions, error: roleError } = await supabase
      .from('role_permissions')
      .select('*');

    if (roleError) {
      console.error('Error fetching role permissions:', roleError);
      return;
    }

    // Group role permissions by role
    const rolePermissionMap = {};
    rolePermissions.forEach(rp => {
      if (!rolePermissionMap[rp.role]) {
        rolePermissionMap[rp.role] = {};
      }
      rolePermissionMap[rp.role][rp.permission_key] = rp.permission_value;
    });

    console.log('Role permissions loaded for:', Object.keys(rolePermissionMap).join(', '));

    // 3. Process each user
    for (const user of users) {
      console.log(`\n📋 Processing user: ${user.username} (${user.role})`);

      // Get user's current permissions from user_permissions table
      const { data: userPerms, error: userPermsError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (userPermsError) {
        console.error(`Error fetching permissions for ${user.username}:`, userPermsError);
        continue;
      }

      // Build the final permissions object
      const finalPermissions = {};

      // Start with role defaults
      if (rolePermissionMap[user.role]) {
        Object.assign(finalPermissions, rolePermissionMap[user.role]);
      }

      // Apply user-specific permissions from user_permissions table
      if (userPerms && userPerms.length > 0) {
        userPerms.forEach(up => {
          finalPermissions[up.permission_key] = up.permission_value;
        });
      }

      // Apply permission_overrides if they exist
      if (user.permission_overrides && typeof user.permission_overrides === 'object') {
        Object.entries(user.permission_overrides).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            finalPermissions[key] = value;
          }
        });
      }

      // 4. Sync back to user_permissions table
      console.log(`   Syncing permissions to user_permissions table...`);
      
      for (const [key, value] of Object.entries(finalPermissions)) {
        // Skip role defaults if they match (no need to store in user_permissions)
        if (rolePermissionMap[user.role] && 
            rolePermissionMap[user.role][key] === value) {
          continue;
        }

        // Check if permission exists in user_permissions
        const existingPerm = userPerms.find(up => up.permission_key === key);

        if (existingPerm) {
          // Update if value changed
          if (existingPerm.permission_value !== value) {
            const { error } = await supabase
              .from('user_permissions')
              .update({ 
                permission_value: value,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('permission_key', key);

            if (error) {
              console.error(`   ❌ Failed to update ${key}:`, error.message);
            } else {
              console.log(`   ✅ Updated ${key}: ${existingPerm.permission_value} → ${value}`);
            }
          }
        } else {
          // Insert new permission
          const { error } = await supabase
            .from('user_permissions')
            .insert({
              user_id: user.id,
              permission_key: key,
              permission_value: value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error(`   ❌ Failed to insert ${key}:`, error.message);
          } else {
            console.log(`   ✅ Added ${key}: ${value}`);
          }
        }
      }

      // 5. Remove the permission_overrides field (deprecated)
      if (user.permission_overrides && Object.keys(user.permission_overrides).length > 0) {
        console.log(`   Clearing deprecated permission_overrides field...`);
        const { error } = await supabase
          .from('app_users')
          .update({ 
            permission_overrides: {},
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error(`   ❌ Failed to clear permission_overrides:`, error.message);
        } else {
          console.log(`   ✅ Cleared permission_overrides`);
        }
      }
    }

    // 6. Verify specific users
    console.log('\n\n🔍 Verifying key users...');
    
    const verifyUsers = ['sagim', 'admin'];
    for (const username of verifyUsers) {
      const { data: user } = await supabase
        .from('app_users')
        .select('id, username, role')
        .eq('username', username)
        .single();

      if (user) {
        const { data: perms } = await supabase
          .from('user_permissions')
          .select('permission_key, permission_value')
          .eq('user_id', user.id)
          .eq('permission_key', 'access.analytics')
          .single();

        if (perms) {
          console.log(`   ${username}: access.analytics = ${perms.permission_value ? '✅' : '❌'}`);
        } else {
          console.log(`   ${username}: access.analytics = (using role default)`);
        }
      }
    }

    console.log('\n✅ Synchronization complete!');
    
  } catch (error) {
    console.error('Error during synchronization:', error);
  }
}

syncUserPermissions().catch(console.error); 