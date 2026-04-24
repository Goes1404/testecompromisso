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

async function findJoelma() {
    console.log('Searching for any user related to "Joelma" or "Macedo"...');
    
    // Search profiles
    const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .or('name.ilike.%joelma%,name.ilike.%macedo%,email.ilike.%joelma%,email.ilike.%macedo%');
        
    if (searchError) {
        console.error('Error searching profiles:', searchError);
        return;
    }
    
    console.log('Found profiles:', profiles.map(p => ({ id: p.id, name: p.name, email: p.email })));

    // Search Auth directly
    console.log('Searching Auth users...');
    const { data: { users }, error: authSearchError } = await supabase.auth.admin.listUsers();
    
    if (authSearchError) {
        console.error('Error listing auth users:', authSearchError);
    } else {
        const matchingAuth = users.filter(u => 
            (u.email && (u.email.toLowerCase().includes('joelma') || u.email.toLowerCase().includes('macedo'))) ||
            (u.user_metadata && u.user_metadata.full_name && (u.user_metadata.full_name.toLowerCase().includes('joelma') || u.user_metadata.full_name.toLowerCase().includes('macedo'))) ||
            (u.user_metadata && u.user_metadata.name && (u.user_metadata.name.toLowerCase().includes('joelma') || u.user_metadata.name.toLowerCase().includes('macedo')))
        );
        console.log('Matching Auth users:', matchingAuth.map(u => ({ id: u.id, email: u.email, metadata: u.user_metadata })));
    }
}

findJoelma();
