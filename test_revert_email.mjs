
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

async function testRevert() {
    const userId = 'a6609f58-8307-4640-b922-9e80e9b8fdcd'; // Leonardo Ferreira Godoi (_new)
    const targetEmail = 'leonardofgodoi@compromisso.com';
    
    console.log(`Attempting to revert email for user ${userId} to ${targetEmail}...`);
    
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        email: targetEmail,
        email_confirm: true
    });

    if (error) {
        console.error('Revert FAILED:', JSON.stringify(error, null, 2));
    } else {
        console.log('Revert SUCCESSFUL! Email updated in Auth.');
        // Also update profiles table
        const { error: pError } = await supabase.from('profiles').update({ email: targetEmail }).eq('id', userId);
        if (pError) console.error('Profile update failed:', pError);
        else console.log('Profile updated.');
    }
}

testRevert();
