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

async function searchGuimaraes() {
    console.log('Searching for "Guimarães" in institution...');
    const { data, error } = await supabase
        .from('profiles')
        .select('institution')
        .ilike('institution', '%Guimarães%');
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    const uniqueSchools = [...new Set(data.map(d => d.institution))];
    console.log('Found schools:', uniqueSchools);
}

searchGuimaraes();
