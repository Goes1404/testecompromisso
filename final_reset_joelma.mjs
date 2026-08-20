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

async function finalReset() {
    const userId = '7c72ef96-8472-4256-a7f1-4c163612cd7c';
    const newName = 'Joelma Macedo';
    const newPassword = 'compromisso2026';

    console.log(`Resetting Joelma Macedo (ID: ${userId})...`);

    // 1. Update Auth (Password and Metadata)
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
            password: newPassword,
            user_metadata: { 
                must_change_password: true,
                full_name: newName
            }
        }
    );

    if (authError) {
        console.error('Error updating auth:', authError);
        return;
    }
    console.log('Auth updated: Password reset and must_change_password set.');

    // 2. Update Profile (Name)
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
            name: newName,
            full_name: newName
        })
        .eq('id', userId);

    if (profileError) {
        console.error('Error updating profile:', profileError);
        return;
    }
    console.log('Profile updated: Name changed to Joelma Macedo.');
}

finalReset();
