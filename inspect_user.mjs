
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

async function inspect(email) {
    console.log(`Buscando usuario: ${email}`);
    
    // Auth Check with Pagination
    let page = 1;
    let foundAuth = null;
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        foundAuth = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (foundAuth) break;
        page++;
    }
    
    if (foundAuth) {
        console.log('User found in Auth:');
        console.log('ID:', foundAuth.id);
        console.log('Metadata:', JSON.stringify(foundAuth.user_metadata, null, 2));
    } else {
        console.log('User NOT found in Auth across all pages.');
    }
    
    // Profile Table Check
    const { data: profile } = await supabase.from('profiles').select('*').ilike('email', email).single();
    if (profile) {
        console.log('Profile found in table:');
        console.log(JSON.stringify(profile, null, 2));
    } else {
        console.log('Profile NOT found in table.');
    }
}

inspect('yuriglima@compromisso.com');
