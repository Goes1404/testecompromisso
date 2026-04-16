
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

async function attemptAbsoluteRefactor() {
    const email = 'kethellyngfernandes@compromisso.com';
    const newEmail = 'kethellyngfernandes_new@compromisso.com';
    const fullName = 'Kethellyn Gabrielly Fernandes';

    console.log(`Phase 1: Deleting existing _new account for ${fullName}...`);
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const newUser = users.find(u => u.email === newEmail);
    
    if (newUser) {
        console.log(`Found _new user: ${newUser.id}. Deleting...`);
        await supabase.auth.admin.deleteUser(newUser.id);
        await supabase.from('profiles').delete().eq('id', newUser.id);
        console.log('Deleted.');
    } else {
        console.log('No _new user found.');
    }

    console.log('Phase 2: Waiting for DB sync (3 seconds)...');
    await new Promise(r => setTimeout(r, 3000));

    console.log(`Phase 3: Attempting to create ORIGINAL account: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'compromisso2026',
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'student' }
    });

    if (authError) {
        console.error('CRITICAL FAILURE on original email:', JSON.stringify(authError, null, 2));
        
        console.log('Phase 4: Attempting to create with a slightly different pattern (kethellyn.fernandes)...');
        const altPattern = 'kethellyn.fernandes@compromisso.com';
        const { data: altData, error: altError } = await supabase.auth.admin.createUser({
            email: altPattern,
            password: 'compromisso2026',
            email_confirm: true,
            user_metadata: { full_name: fullName, role: 'student' }
        });

        if (altError) {
             console.error('Even alt pattern failed:', altError);
        } else {
             console.log('SUCCESS with alt pattern:', altPattern);
             // Sync profile
             await supabase.from('profiles').upsert({ id: altData.user.id, email: altPattern, full_name: fullName, role: 'student' });
        }
    } else {
        console.log('SUCCESS! Created original email.');
        await supabase.from('profiles').upsert({ id: authData.user.id, email: email, full_name: fullName, role: 'student' });
    }
}

attemptAbsoluteRefactor();
