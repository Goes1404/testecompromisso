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

async function checkAuthUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  // Sort by created_at descending to get the newest
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  console.log("Recent Auth Users:");
  for (const u of users.slice(0, 5)) {
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role}`);
    console.log(`App Metadata:`, u.app_metadata);
    console.log(`User Metadata:`, u.user_metadata);
    console.log('---');
  }
}

checkAuthUsers();
