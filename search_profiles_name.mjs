
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

async function searchProfiles() {
    console.log('Searching for Leonardo Ferreira Godoi in PROFILES...');
    const { data: p1 } = await supabase.from('profiles').select('*').ilike('full_name', '%Leonardo Ferreira Godoi%');
    console.log(JSON.stringify(p1, null, 2));

    console.log('\nSearching for Luiz Claudio in PROFILES...');
    const { data: p2 } = await supabase.from('profiles').select('*').ilike('full_name', '%Luiz Claudio%');
    console.log(JSON.stringify(p2, null, 2));
}

searchProfiles();
