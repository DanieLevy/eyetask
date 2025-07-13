const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissions() {
  console.log('🔍 Testing Permissions System\n');

  try {
    // Test 1: Check admin user permissions
    console.log('1. Testing admin user permissions...');
    const { data: adminUser } = await supabase
      .from('app_users')
      .select('id, username, role')
      .eq('username', 'admin')
      .single();

    if (adminUser) {
      console.log(`   ✅ Found admin user: ${adminUser.username} (${adminUser.role})`);
      
      // Check role permissions
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_key, permission_value')
        .eq('role', 'admin')
        .eq('permission_key', 'access.analytics')
        .single();

      console.log(`   - Admin role has analytics: ${rolePerms?.permission_value ? '✅' : '❌'}`);
    }

    // Test 2: Check sagim user permissions
    console.log('\n2. Testing sagim user permissions...');
    const { data: sagimUser } = await supabase
      .from('app_users')
      .select('id, username, role')
      .eq('username', 'sagim')
      .single();

    if (sagimUser) {
      console.log(`   ✅ Found sagim user: ${sagimUser.username} (${sagimUser.role})`);
      
      // Check user-specific permissions
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('permission_key, permission_value')
        .eq('user_id', sagimUser.id)
        .eq('permission_key', 'access.analytics');

      if (userPerms && userPerms.length > 0) {
        console.log(`   - User override for analytics: ${userPerms[0].permission_value ? '✅' : '❌'}`);
      } else {
        console.log('   - No user override for analytics (using role default)');
      }
    }

    // Test 3: Check all role permissions
    console.log('\n3. Checking all role permissions...');
    const { data: allRolePerms } = await supabase
      .from('role_permissions')
      .select('role, permission_key, permission_value')
      .eq('permission_key', 'access.analytics')
      .order('role');

    console.log('   Analytics permission by role:');
    allRolePerms?.forEach(perm => {
      console.log(`   - ${perm.role}: ${perm.permission_value ? '✅' : '❌'}`);
    });

    // Test 4: Check project data query
    console.log('\n4. Testing project data query...');
    const projectName = 'Calibrations & Stability';
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', projectName)
      .single();

    if (projectError) {
      console.error(`   ❌ Error fetching project: ${projectError.message}`);
    } else {
      console.log(`   ✅ Found project: ${project.name} (ID: ${project.id})`);
      
      // Check tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('project_id', project.id)
        .eq('is_visible', true);

      if (tasksError) {
        console.error(`   ❌ Error fetching tasks: ${tasksError.message}`);
      } else {
        console.log(`   ✅ Found ${tasks?.length || 0} visible tasks`);
      }
    }

    // Test 5: Direct permission function test
    console.log('\n5. Testing permission logic...');
    
    // Simulate admin permission check
    const adminRole = 'admin';
    const driverRole = 'driver_manager';
    
    console.log(`   - Admin role === 'admin': ${adminRole === 'admin' ? '✅' : '❌'}`);
    console.log(`   - Driver role === 'admin': ${driverRole === 'admin' ? '❌ (correct)' : '❌'}`);

    console.log('\n✅ Permission tests complete!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testPermissions().catch(console.error); 