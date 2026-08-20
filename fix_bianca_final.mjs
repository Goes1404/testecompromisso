
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

async function fixBianca() {
    const userId = 'd43a9e67-f7cb-4f2a-a2cc-2f633f8dc7ab';
    const newEmail = 'bianca.souza@compromisso.com';
    const newName = 'Bianca Souza de Freitas';

    console.log('Fixing Bianca:', userId);

    // 1. Update Auth
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
            email: newEmail,
            password: 'Compromisso123!',
            user_metadata: { must_change_password: true }
        }
    );

    if (authError) {
        console.error('Error updating auth:', authError);
        return;
    }
    console.log('Auth updated.');

    // 2. Update Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
            email: newEmail,
            name: newName,
            full_name: newName
        })
        .eq('id', userId);

    if (profileError) {
        console.error('Error updating profile:', profileError);
        return;
    }
    console.log('Profile updated.');
}

fixBianca();
