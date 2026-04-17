
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkYuri() {
    const email = 'yuritmendes@compromisso.com';
    console.log(`Checking status for ${email}...`);
    
    // Auth check
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (authUser) {
        console.log(`Auth user FOUND: ${authUser.id}`);
    } else {
        console.log('Auth user NOT found.');
    }

    // Profile check
    const { data: profile } = await supabase.from('profiles').select('*').ilike('email', email).single();
    if (profile) {
        console.log(`Profile FOUND: ${profile.full_name} (ID: ${profile.id})`);
    } else {
        console.log('Profile NOT found.');
    }
}

checkYuri();
