
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateTeachersMetadata() {
  console.log("Fetching all users...");
  
  // Use admin API to list users (requires service_role key)
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error fetching users:", error.message);
    return;
  }

  const users = data.users;
  console.log(`Found ${users.length} users. Filtering teachers...`);

  // We consider users whose email ends with @compromisso.com
  const teachers = users.filter(user => 
    user.email.endsWith('@compromisso.com') || 
    (user.user_metadata && user.user_metadata.role === 'teacher')
  );

  console.log(`Found ${teachers.length} teachers to update.`);

  for (const teacher of teachers) {
    console.log(`Updating metadata for: ${teacher.email}...`);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      teacher.id,
      { user_metadata: { ...teacher.user_metadata, must_change_password: true } }
    );

    if (updateError) {
      console.error(`- Error updating ${teacher.email}:`, updateError.message);
    } else {
      console.log(`- Success!`);
    }
  }

  console.log("\nBatch completed.");
}

updateTeachersMetadata();
