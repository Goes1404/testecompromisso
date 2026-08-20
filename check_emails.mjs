import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load env
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificEmail() {
    const emails = [
        'joelmamacedo@compromisso.com',
        'joelma.macedo@compromisso.com',
        'joelma@compromisso.com',
        'macedo.joelma@compromisso.com'
    ];

    for (const email of emails) {
        console.log(`Checking email: ${email}`);
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        // listUsers doesn't support filtering by email easily without listing all, 
        // but we can try to find by email if we had the method. 
        // Wait, getUserByEmail is not in admin? No, it's not.
        
        const found = users.find(u => u.email === email);
        if (found) {
            console.log(`FOUND! Email: ${email}, ID: ${found.id}`);
            return;
        }
    }
    console.log('None of the guessed emails found in the first 50 users.');
}

checkSpecificEmail();
