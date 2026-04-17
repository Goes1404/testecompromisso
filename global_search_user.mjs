
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

async function globalSearch() {
    const { data: users } = await supabase.from('profiles').select('full_name, email, id');
    console.log('Total profiles:', users.length);
    const matches = users.filter(u => u.full_name && u.full_name.toLowerCase().includes('teste'));
    console.log('Matches for "teste":', matches);
    
    const matches2 = users.filter(u => u.full_name && u.full_name.toLowerCase().includes('aluno'));
    console.log('Matches for "aluno":', matches2);
}

globalSearch();
