
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

async function createStudent() {
    const email = 'kethellyngfernandes@compromisso.com';
    const fullName = 'Kethellyn Gabrielly Fernandes';
    const password = 'compromisso2026';

    console.log(`Creating user: ${email}`);
    
    // 1. Create in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: 'student',
            must_change_password: true
        }
    });

    if (authError) {
        console.error('Auth Creation FAILED:', JSON.stringify(authError, null, 2));
        if (authError.status === 500) {
            console.log('Detected 500 error. Retrying with workaround email...');
            const altEmail = 'kethellyngfernandes_new@compromisso.com';
            return retryWithEmail(altEmail, fullName, password);
        }
        return;
    }

    const userId = authData.user.id;
    console.log(`Auth user created: ${userId}`);

    // 2. Create in Profiles
    const { error: pError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'student'
    });

    if (pError) {
        console.error('Profile Creation FAILED:', pError);
    } else {
        console.log('Profile created successfully.');
    }
}

async function retryWithEmail(email, fullName, password) {
    console.log(`Retrying with: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: 'student',
            must_change_password: true
        }
    });

    if (authError) {
        console.error('Retry FAILED:', JSON.stringify(authError, null, 2));
        return;
    }

    const userId = authData.user.id;
    console.log(`Auth user created: ${userId}`);

    const { error: pError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'student'
    });

    if (pError) {
        console.error('Profile Creation FAILED:', pError);
    } else {
        console.log('Profile created successfully.');
        console.log(`IMPORTANT: Student should login with ${email}`);
    }
}

createStudent();
