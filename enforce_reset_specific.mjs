
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

async function enforceReset() {
    const targetEmails = [
        'leonardo.godoi@compromisso.com',
        'luiz.claudio@compromisso.com',
        'mathias.nobre@compromisso.com',
        'kethellyn.fernandes@compromisso.com',
        'richardylcosta@compromisso.com'
    ];

    console.log('--- ENFORCING PASSWORD RESET ---');

    const { data: { users } } = await supabase.auth.admin.listUsers();

    for (const email of targetEmails) {
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            console.log(`Enforcing for ${email} (ID: ${user.id})...`);
            
            // Merge existing metadata with must_change_password: true
            const newMetadata = {
                ...user.user_metadata,
                must_change_password: true
            };

            const { error } = await supabase.auth.admin.updateUserById(user.id, {
                user_metadata: newMetadata
            });

            if (error) {
                console.error(`Error updating ${email}:`, error);
            } else {
                console.log(`Success! ${email} will be forced to reset.`);
            }
        } else {
            console.warn(`User with email ${email} NOT FOUND in Auth.`);
        }
    }
}

enforceReset();
