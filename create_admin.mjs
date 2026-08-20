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

async function createAdmin() {
  const email = 'adm@compromisso.com';
  const password = 'compromisso2026';
  const name = 'Administrador do Sistema';
  
  console.log(`Creating user: ${email}...`);

  // 1. Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      profile_type: 'admin',
      role: 'admin'
    }
  });

  if (authError) {
    if (authError.message.includes('already exists') || authError.code === 'user_already_exists' || authError.code === 'email_exists') {
        console.log(`User ${email} already exists in Auth. Updating password and profile...`);
        // We will try to fetch the existing user to update the profile below
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
            await supabase.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
            console.log("Password updated.");
            
            // Update profile
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: existingUser.id,
                email,
                name,
                role: 'admin',
                profile_type: 'admin',
                status: 'active'
            });
            if (profileError) console.error("Error updating profile:", profileError);
            else console.log("Profile updated successfully!");
        }
        return;
    }
    console.error("Error creating user:", authError);
    return;
  }

  console.log(`Auth user created! ID: ${authData.user.id}`);

  // 2. Create/Update profile in public.profiles
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    name,
    role: 'admin',
    profile_type: 'admin',
    status: 'active'
  });

  if (profileError) {
    console.error("Error creating profile:", profileError);
    return;
  }

  console.log("Admin profile created successfully!");
}

createAdmin();
