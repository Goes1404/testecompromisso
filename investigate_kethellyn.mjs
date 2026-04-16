
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

async function investigate() {
    const email = 'kethellyngfernandes@compromisso.com';
    const name = 'Kethellyn Gabrielly Fernandes';

    console.log(`Checking Auth for: ${email}`);
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (authUser) {
        console.log(`Auth user found: ${authUser.id}`);
    } else {
        console.log('Auth user NOT found.');
    }

    console.log(`Checking Profile for: ${email}`);
    const { data: profile } = await supabase.from('profiles').select('*').ilike('email', email).single();
    if (profile) {
        console.log(`Profile found: ${JSON.stringify(profile, null, 2)}`);
    } else {
        console.log('Profile NOT found.');
    }
}

investigate();
