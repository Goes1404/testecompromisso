
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestStudent() {
  const email = 'aluno@compromisso.com';
  const name = 'Aluno Teste';
  const password = 'compromisso2026';

  console.log(`Checking if user ${email} exists...`);

  // Try to find the user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError.message);
    return;
  }

  let existingUser = users.find(u => u.email === email);
  let userId;

  if (existingUser) {
    console.log("User already exists in Auth. Updating password and metadata...");
    userId = existingUser.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
      user_metadata: {
        full_name: name,
        profile_type: 'student',
        must_change_password: false
      }
    });
    if (updateError) {
      console.error("Error updating user:", updateError.message);
    }
  } else {
    console.log("Creating new user in Auth...");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        profile_type: 'student',
        must_change_password: false
      }
    });

    if (createError) {
      console.error("Error creating user:", createError.message);
      return;
    }
    userId = createData.user.id;
  }

  // Ensure profile exists
  console.log("Ensuring profile exists in 'profiles' table...");
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: name,
      email: email,
      profile_type: 'student',
      status: 'active'
    });

  if (profileError) {
    console.error("Error upserting profile:", profileError.message);
  } else {
    console.log(`\n✅ Sucesso!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${password}`);
    console.log(`👤 Nome: ${name}`);
  }
}

createTestStudent();
