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

async function registerGabriel() {
    const name = 'Gabriel Antônio de Azevedo Fonseca';
    const email = 'gabrielafonseca@compromisso.com';
    const institution = 'Ulysses Silveira Guimarães';
    const sala = 'sala 1';
    const periodo = 'manhã';
    const password = 'Compromisso2026!';

    console.log(`Registering Gabriel: ${email}`);

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { 
            full_name: name,
            must_change_password: true
        }
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('Email already registered in Auth. Checking profile...');
            // Maybe find him and update?
            const { data: users } = await supabase.auth.admin.listUsers();
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                console.log(`Found existing user with ID: ${existingUser.id}`);
                // Update profile if needed
                return;
            }
        }
        console.error('Error creating auth user:', authError);
        return;
    }

    const userId = authData.user.id;
    console.log(`Auth user created with ID: ${userId}`);

    // 2. Create Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            name: name,
            full_name: name,
            email: email,
            institution: institution,
            sala: sala,
            periodo: periodo,
            role: 'student',
            profile_type: 'Aluno',
            course: 'ENEM', // Default
            status: 'active'
        });

    if (profileError) {
        console.error('Error creating profile:', profileError);
        return;
    }

    console.log('Profile created successfully.');
}

registerGabriel();
