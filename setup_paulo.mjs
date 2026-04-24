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

async function findOrCreatePaulo() {
    const email = 'paulobaraujo@compromisso.com';
    const name = 'Paulo B Araujo';
    const subject = 'Química';
    const password = 'Compromisso2026!';

    console.log(`Checking for user: ${email}`);

    // Check profiles
    const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);
        
    if (searchError) {
        console.error('Error searching profiles:', searchError);
        return;
    }
    
    if (profiles && profiles.length > 0) {
        console.log('User found in profiles:', profiles[0]);
        // Update to make sure he is a chemistry teacher
        const userId = profiles[0].id;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                favorite_subject: subject,
                role: 'teacher',
                profile_type: 'Professor'
            })
            .eq('id', userId);
            
        if (updateError) {
            console.error('Error updating profile:', updateError);
        } else {
            console.log('Profile updated to Professor de Química.');
        }
        return;
    }

    console.log('User not found. Creating...');

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
            console.log('Email already registered in Auth but not in profiles. Fetching Auth user...');
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                console.log(`Found existing auth user with ID: ${existingUser.id}. We need to create the profile.`);
                // We'll create the profile for this existing user
                await createProfile(existingUser.id, name, email, subject);
            }
        } else {
            console.error('Error creating auth user:', authError);
        }
        return;
    }

    const userId = authData.user.id;
    console.log(`Auth user created with ID: ${userId}`);

    // Wait a bit to ensure triggers have run if they exist
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Create/Update Profile
    await createProfile(userId, name, email, subject);
}

async function createProfile(userId, name, email, subject) {
    // Try to update first, in case trigger created it
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            name: name,
            full_name: name,
            role: 'teacher',
            profile_type: 'Professor',
            favorite_subject: subject,
            course: 'Professor',
            status: 'active'
        })
        .eq('id', userId);
        
    if (!updateError) {
         console.log('Updated existing profile (probably created by trigger).');
         return;
    }

    // If update fails, insert
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            name: name,
            full_name: name,
            email: email,
            role: 'teacher',
            profile_type: 'Professor',
            favorite_subject: subject,
            course: 'Professor',
            status: 'active'
        });

    if (profileError) {
        console.error('Error upserting profile:', profileError);
        return;
    }

    console.log('Profile created/upserted successfully.');
}

findOrCreatePaulo();
