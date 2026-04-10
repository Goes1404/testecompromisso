import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Reading full student list...");
  const content = fs.readFileSync('full_student_list_grouped.md', 'utf8');
  const lines = content.split('\n');
  
  const students = [];
  let currentTarget = null;
  
  for (const line of lines) {
    if (line.includes('## Alunos ENEM')) currentTarget = 'ENEM';
    else if (line.includes('## Alunos ETEC') || line.includes('Alunos ETEC')) currentTarget = 'ETEC';
    
    if (line.startsWith('|') && !line.includes('Nome | E-mail') && !line.includes(':---')) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        const name = parts[1].trim();
        const email = parts[2].trim().toLowerCase();
        if (name && email) {
          students.push({
            name,
            email,
            role: 'student',
            target_exam: currentTarget || 'ENEM'
          });
        }
      }
    }
  }

  console.log(`Found ${students.length} students in markdown file.`);

  // Load all auth users
  console.log("Loading all auth users...");
  let allAuthUsers = [];
  let page = 1;
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });
    if (error) {
       console.error("Error fetching users:", error);
       break;
    }
    if (!users || users.length === 0) break;
    allAuthUsers = allAuthUsers.concat(users);
    page++;
  }
  const authUserMap = new Map();
  allAuthUsers.forEach(u => authUserMap.set(u.email, u));
  console.log(`Loaded ${allAuthUsers.length} total auth users.`);

  // Load all profiles
  console.log("Loading all profiles...");
  const { data: allProfiles, error: profileErr } = await supabase.from('profiles').select('id, email');
  if (profileErr) {
     console.error("Error loading profiles:", profileErr);
  }
  const profileMap = new Map();
  if (allProfiles) {
      allProfiles.forEach(p => profileMap.set(p.email, p));
  }

  // Add Priscila Lima
  students.push({
    name: 'Priscila Lima',
    email: 'priscilalima@compromisso.com',
    role: 'admin',
    target_exam: null
  });

  console.log("Processing accounts...");
  let countCreatedAuth = 0;
  let countUpdatedAuth = 0;
  let countUpsertedProfile = 0;

  for (const student of students) {
    let authUser = authUserMap.get(student.email);
    let userId;

    if (!authUser) {
      // Create auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: student.email,
        password: 'compromisso2026',
        email_confirm: true,
        user_metadata: { role: student.role, must_change_password: false }
      });
      if (error) {
        console.error(`Failed to create auth for ${student.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
      countCreatedAuth++;
      console.log(`Created new auth account for: ${student.email}`);
    } else {
      // Update existing auth user to ensure 'compromisso2026' password and no forced reset
      userId = authUser.id;
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: 'compromisso2026',
        user_metadata: { role: student.role, must_change_password: false }
      });
      if (error) {
        console.error(`Failed to update password for ${student.email}:`, error.message);
      } else {
        countUpdatedAuth++;
      }
    }

    // Upsert into Profiles table
    const profileData = {
      id: userId,
      email: student.email,
      name: student.name,
      role: student.role,
      updated_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert(profileData);

    if (upsertErr) {
      console.error(`Failed to upsert profile for ${student.email}:`, upsertErr.message);
    } else {
      countUpsertedProfile++;
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Auth Accounts Created: ${countCreatedAuth}`);
  console.log(`Auth Accounts Updated with 'compromisso2026' and NO reset flag: ${countUpdatedAuth}`);
  console.log(`Profiles Upserted: ${countUpsertedProfile}`);
  console.log("Priscila Lima (admin) has been created/updated with password 'compromisso2026'.");
}

run();
