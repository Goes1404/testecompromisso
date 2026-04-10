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

async function check() {
  let allUsers = [];
  let page = 1;
  while (true) {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error(error); break; }
    if (users.users.length === 0) break;
    allUsers.push(...users.users);
    page++;
  }

  const students = allUsers.filter(u => u.user_metadata?.role === 'student' || u.user_metadata?.profile_type === 'student');
  console.log(`Total students in auth.users: ${students.length}`);

  const nameCounts = {};
  const duplicateUsers = [];

  for (const s of students) {
    const name = (s.user_metadata?.full_name || 'UNKNOWN').trim().toLowerCase();
    if (!nameCounts[name]) {
      nameCounts[name] = [];
    }
    nameCounts[name].push(s);
  }

  for (const name in nameCounts) {
    if (nameCounts[name].length > 1) {
      duplicateUsers.push({ name, count: nameCounts[name].length, users: nameCounts[name].map(u => u.email) });
    }
  }

  console.log(`Found ${duplicateUsers.length} duplicated names.`);
  if (duplicateUsers.length > 0) {
    console.log('Sample duplicates:');
    for (const d of duplicateUsers.slice(0, 10)) {
        console.log(`Name: ${d.name}`);
        d.users.forEach(e => console.log(`  - ${e}`));
    }
  }

  const { data: profiles, error: pError } = await supabaseAdmin.from('profiles').select('*').in('role', ['student', 'student_pending', 'aluno']);
  if (!pError) {
    console.log(`Total profiles with student-like roles: ${profiles.length}`);
  }
}

check();
