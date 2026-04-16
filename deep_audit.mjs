
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

async function deepAudit() {
    const terms = ['Leonardo Ferreira Godoi', 'Luiz Claudio', 'Mathias', 'leonardofgodoi', 'luizclaudio', 'mathiasgnobre'];
    
    for (const term of terms) {
        console.log(`\nSearching for "${term}" in PROFILES...`);
        const { data: byName } = await supabase.from('profiles').select('*').ilike('full_name', `%${term}%`);
        const { data: byEmail } = await supabase.from('profiles').select('*').ilike('email', `%${term}%`);
        
        const combined = [...(byName || []), ...(byEmail || [])];
        if (combined.length === 0) console.log('None found.');
        else {
            combined.forEach(p => console.log(`- ID: ${p.id} | Name: ${p.full_name} | Email: ${p.email}`));
        }
    }
}

deepAudit();
