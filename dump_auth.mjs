
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

async function dumpAuth() {
    let allUsers = [];
    let page = 1;
    while(true) {
        console.log(`Fetching page ${page}...`);
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        allUsers = allUsers.concat(users.map(u => ({ id: u.id, email: u.email, full_name: u.user_metadata?.full_name })));
        page++;
    }
    fs.writeFileSync('auth_users_dump.json', JSON.stringify(allUsers, null, 2));
    console.log(`Dumped ${allUsers.length} users.`);
}

dumpAuth();
