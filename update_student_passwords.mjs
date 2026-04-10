import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePasswords() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10000 });
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  const students = users.filter(u => u.user_metadata?.role === 'student' || (!u.user_metadata?.role && u.email !== 'priscilalima@compromisso.com'));
  console.log(`Found ${students.length} students to update.`);

  let successCount = 0;
  for (let i = 0; i < students.length; i++) {
    const u = students[i];
    const { error: updateError } = await supabase.auth.admin.updateUserById(u.id, {
      password: 'compromisso2026',
      user_metadata: { ...u.user_metadata, role: 'student', password_resetted: true }
    });
    if (updateError) {
      console.error(`Failed to update ${u.email}:`, updateError.message);
    } else {
      successCount++;
    }
  }
  console.log(`Successfully updated ${successCount} student passwords.`);
}

updatePasswords();
