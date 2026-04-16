
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

async function finalScour() {
    const terms = ['Godoi', 'Ferreira', 'Claudio', 'Richardy', 'Mathias'];
    for (const term of terms) {
        console.log(`\nScouring for "${term}"...`);
        const { data } = await supabase.from('profiles').select('*').or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
        if (data && data.length > 0) {
            data.forEach(p => console.log(`- ${p.full_name} (${p.email}) ID: ${p.id}`));
        } else {
            console.log('None found.');
        }
    }
}

finalScour();
