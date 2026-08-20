
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function checkAvailability() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    const emails = users.map(u => u.email);
    console.log('Is bianca.souza@compromisso.com taken?', emails.includes('bianca.souza@compromisso.com'));
    console.log('Is bianca.sousa@compromisso.com taken?', emails.includes('bianca.sousa@compromisso.com'));
}

checkAvailability();
