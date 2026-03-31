const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateExistingTeachers() {
  console.log("Fetching all profiles to identify teachers...");
  
  // 1. Get all profiles where profile_type is teacher
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('profile_type', 'teacher');

  if (profileError) {
    console.error("Error fetching profiles:", profileError.message);
    return;
  }

  console.log(`Found ${profiles.length} teacher profiles. Updating names...`);

  for (const profile of profiles) {
    const nameParts = (profile.name || '').trim().split(' ');
    if (nameParts.length < 2) {
      console.log(`- Skipping ${profile.email}: Name '${profile.name}' is too short.`);
      continue;
    }

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const displayName = `${firstName} ${lastName}`;

    console.log(`- Updating ${profile.email}: '${profile.name}' -> '${displayName}'`);

    // Update Profile
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ name: displayName })
      .eq('id', profile.id);

    if (updateProfileError) {
      console.error(`  - Error updating profile ${profile.email}:`, updateProfileError.message);
    }

    // Update Auth Metadata (Full name + Security Flag)
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { 
        user_metadata: { 
            full_name: displayName,
            must_change_password: true 
        } 
      }
    );

    if (updateAuthError) {
      console.error(`  - Error updating auth metadata for ${profile.email}:`, updateAuthError.message);
    }
  }

  console.log("\nUpdate completed.");
}

updateExistingTeachers();
