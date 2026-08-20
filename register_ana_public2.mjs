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

    const userId = 'df3de225-5c2e-4e2b-a395-ac8672e40261'; // Already created in the previous run

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
            exam_target: 'ENEM', // Changed from course to exam_target
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
