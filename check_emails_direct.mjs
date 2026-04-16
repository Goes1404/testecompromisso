
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

async function checkEmailsInProfiles() {
    const emails = [
        'leonardofgodoi@compromisso.com',
        'richardylcosta@compromisso.com',
        'luizclaudio@compromisso.com',
        'mathiasgnobre@compromisso.com'
    ];

    console.log('Checking profiles for these exact emails:');
    const { data, error } = await supabase.from('profiles').select('*').in('email', emails);
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

checkEmailsInProfiles();
