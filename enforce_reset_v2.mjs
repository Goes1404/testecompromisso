
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

async function enforceResetPaginated() {
    const targetEmails = [
        'leonardo.godoi@compromisso.com',
        'luiz.claudio@compromisso.com',
        'mathias.nobre@compromisso.com',
        'kethellyn.fernandes@compromisso.com',
        'richardylcosta@compromisso.com'
    ];

    console.log('--- ENFORCING PASSWORD RESET (PAGINATED) ---');

    let allUsers = [];
    let page = 1;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        allUsers = allUsers.concat(users);
        page++;
    }

    for (const email of targetEmails) {
        const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            console.log(`Enforcing for ${email}...`);
            await supabase.auth.admin.updateUserById(user.id, {
                user_metadata: { ...user.user_metadata, must_change_password: true }
            });
            console.log(`Success! ${email} updated.`);
        } else {
            console.warn(`User with email ${email} NOT FOUND.`);
        }
    }
}

enforceResetPaginated();
