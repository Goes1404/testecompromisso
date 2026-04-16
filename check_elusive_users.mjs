
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

async function checkEmails() {
    const emails = [
        'leonardofgodoi@compromisso.com',
        'luizclaudio@compromisso.com',
        'mathiasgnobre@compromisso.com'
    ];

    for (const email of emails) {
        console.log(`\nChecking email: ${email}`);
        // This method might not be in all versions of the client, but let's try.
        // If not, we'll use listUsers again with no pagination first.
        try {
            const { data, error } = await supabase.auth.admin.listUsers();
            const found = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (found) {
                console.log(`Found! ID: ${found.id}`);
            } else {
                console.log('Not found in listUsers.');
            }
        } catch (e) {
            console.error('Error in listUsers:', e);
        }
    }
}

checkEmails();
