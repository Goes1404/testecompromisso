import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentUsers() {
  // Let's get the most recently created users in profiles
  // Since created_at might not exist, we'll get from auth.users first, then join
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentAuthUsers = users.slice(0, 10);
  const recentIds = recentAuthUsers.map(u => u.id);
  
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, name, email, role, profile_type')
    .in('id', recentIds);
    
  if (pError) {
     console.error(pError);
     return;
  }
  
  const combined = recentAuthUsers.map(au => {
     const p = profiles.find(pr => pr.id === au.id);
     return {
        email: au.email,
        auth_metadata_role: au.user_metadata?.role,
        auth_metadata_profile_type: au.user_metadata?.profile_type,
        profile_table_role: p?.role,
        profile_table_profile_type: p?.profile_type
     };
  });
  
  console.table(combined);
}

checkRecentUsers();
