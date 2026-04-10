import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function run() {
  let allUsers = [];
  let page = 1;

  console.log("Fetching users...");
  while (true) {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error(error); return; }
    if (users.users.length === 0) break;
    allUsers.push(...users.users);
    page++;
  }

  const students = allUsers.filter(u => u.user_metadata?.role === 'student' || u.user_metadata?.profile_type === 'student');
  console.log(`Total students found: ${students.length}`);

  let deletedCount = 0;

  // 1. Delete testing accounts, bypass accounts, and UNKNOWN names
  for (const s of students) {
    const email = s.email.toLowerCase();
    const name = (s.user_metadata?.full_name || 'UNKNOWN').trim();

    if (
      email.includes('bypass_') || 
      email.includes('temp_') || 
      email.includes('@test') || 
      name === 'UNKNOWN' ||
      name === '' ||
      email.includes('easdsada') ||
      email.includes('sq1matheusgsilva')
    ) {
      console.log(`Deleting invalid/test account: ${email} (${name})`);
      await supabaseAdmin.from('profiles').delete().eq('id', s.id);
      await supabaseAdmin.auth.admin.deleteUser(s.id);
      deletedCount++;
      s._deleted = true; // Mark as deleted so we don't process it in duplicates
    }
  }

  const validStudents = students.filter(s => !s._deleted);

  // Group by name
  const nameGroups = {};
  for (const s of validStudents) {
    const name = (s.user_metadata?.full_name || '').trim().toLowerCase();
    if (!nameGroups[name]) nameGroups[name] = [];
    nameGroups[name].push(s);
  }

  for (const name in nameGroups) {
    const group = nameGroups[name];
    if (group.length > 1) {
      // Sort by created_at ascending (oldest first)
      group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const keep = group[0];
      const duplicates = group.slice(1);
      
      for (const dup of duplicates) {
        console.log(`Deleting duplicate for ${name}: ${dup.email} (Keeping ${keep.email})`);
        await supabaseAdmin.from('profiles').delete().eq('id', dup.id);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(dup.id);
        if (error) {
           console.error("Failed to delete user", dup.id, error);
        } else {
           deletedCount++;
        }
      }
    }
  }

  console.log(`Done! Deleted ${deletedCount} users.`);
}

run();
