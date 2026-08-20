import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envLocalPath = join(__dirname, '.env.local');

if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSecretary() {
  const email = 'secretaria@compromisso.com';
  const password = 'Compromisso2026!';
  const name = 'Secretaria Compromisso';
  
  console.log(`Checking/Creating user: ${email}...`);

  // 1. Create/Update user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      profile_type: 'staff',
      role: 'staff'
    }
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already exists') || authError.code === 'user_already_exists' || authError.code === 'email_exists') {
        console.log(`User ${email} already exists in Auth. Updating password...`);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
            userId = existingUser.id;
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { 
              password, 
              email_confirm: true,
              user_metadata: {
                full_name: name,
                profile_type: 'staff',
                role: 'staff'
              }
            });
            if (updateError) {
              console.error("Error updating user password/metadata:", updateError);
            } else {
              console.log("Password and metadata updated.");
            }
        }
    } else {
      console.error("Error creating auth user:", authError);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log(`Auth user created! ID: ${userId}`);
  }

  if (!userId) {
    console.error("Could not determine user ID.");
    return;
  }

  // Wait a moment for any db triggers
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 2. Create/Update profile in public.profiles
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    name,
    full_name: name,
    username: 'secretaria',
    role: 'staff',
    profile_type: 'staff',
    status: 'active'
  });

  if (profileError) {
    console.error("Error creating/updating profile in database:", profileError);
    return;
  }

  console.log("Secretary profile created/updated successfully!");
  console.log("Credentials:");
  console.log(`- Email: ${email}`);
  console.log(`- Password: ${password}`);
  console.log(`- Role: staff`);
}

createSecretary();
