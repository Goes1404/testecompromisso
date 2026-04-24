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

async function resetJoelma() {
    console.log('Searching for Joelma Macedo...');
    
    // Find Joelma
    const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', '%macedo%');
        
    if (searchError) {
        console.error('Error searching:', searchError);
        return;
    }
    
    if (!profiles || profiles.length === 0) {
        console.error('Joelma not found in profiles.');
        return;
    }
    
    console.log('Found profiles:', profiles.map(p => ({ id: p.id, name: p.name, email: p.email })));
    
    const joelma = profiles[0];
    const userId = joelma.id;
    console.log('Found Joelma:', joelma.name, 'ID:', userId, 'Email:', joelma.email);

    // 1. Update Auth
    // const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
    //     userId,
    //     { 
    //         password: 'compromisso2026',
    //         user_metadata: { must_change_password: true }
    //     }
    // );

    // if (authError) {
    //     console.error('Error updating auth:', authError);
    //     return;
    // }
    // console.log('Auth updated successfully. Password set to compromisso2026 and must_change_password set to true.');

}

resetJoelma();
