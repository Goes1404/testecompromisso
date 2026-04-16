
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

async function findTraces() {
    const targetEmails = [
        'leonardofgodoi@compromisso.com',
        'luizclaudio@compromisso.com',
        'mathiasgnobre@compromisso.com',
        'kethellyngfernandes@compromisso.com'
    ];

    console.log('--- SEARCHING FOR TRACES ---');
    for (const email of targetEmails) {
        console.log(`\nEmail: ${email}`);
        
        // 1. Check Profiles by Email
        const { data: profiles, error: pError } = await supabase.from('profiles').select('*').ilike('email', email);
        if (profiles && profiles.length > 0) {
            console.log(`[FOUND in Profiles] IDs: ${profiles.map(p => p.id).join(', ')}`);
        } else {
            console.log('[NOT FOUND in Profiles]');
        }

        // 2. Check Profiles by Username (if it exists)
        const { data: pByUsername } = await supabase.from('profiles').select('*').ilike('username', email);
        if (pByUsername && pByUsername.length > 0) {
            console.log(`[FOUND in Profiles by Username] IDs: ${pByUsername.map(p => p.id).join(', ')}`);
        }
    }
}

findTraces();
