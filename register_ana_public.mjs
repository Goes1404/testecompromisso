import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dtvsxhiwcvhnncbnnxci.supabase.co';
const supabaseKey = 'sb_publishable_X_6Vh7pl7LQv9pNrhoO5Qw_gdLgypWO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function registerAna() {
    const name = 'Ana Julya Martins de Almeida';
    const email = 'anajulyamartins@compromisso.com';
    const institution = 'colaso';
    const sala = 'sala 09';
    const periodo = 'manhã';
    const password = 'compromisso2026';

    console.log(`Registering Ana: ${email}`);

    // 1. Create Auth User using signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: name,
                must_change_password: false
            }
        }
    });

    if (authError) {
        console.error('Error creating auth user:', authError);
        return;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error('User not created and no ID returned.');
        return;
    }
    
    console.log(`Auth user created/logged in with ID: ${userId}`);

    // 2. Create Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
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
        console.error('Error creating/updating profile:', profileError);
        return;
    }

    console.log('Profile created successfully.');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

registerAna();
