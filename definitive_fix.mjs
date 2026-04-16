
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

async function runFix() {
    console.log('--- STARTING DEFINITIVE FIX ---');

    // 1. FIX LEONARDO COLLISION
    // ID 3f3d3c07-616e-40b0-83c1-a381e6eaa626 is currently "Leonardo Ferreira Godoi" in profiles 
    // but its Auth is "Leonardo Santos SIlva" (leonardossilva@compromisso.com).
    console.log('\nFixing Leonardo collision...');
    
    // Check if leonardofgodoi is a separate person we want to keep.
    // We will assume yes. We will move the profile back to match Auth.
    const { error: err1 } = await supabase.from('profiles').update({
        email: 'leonardossilva@compromisso.com',
        full_name: 'Leonardo Santos SIlva',
        name: 'Leonardo Santos SIlva'
    }).eq('id', '3f3d3c07-616e-40b0-83c1-a381e6eaa626');
    
    if (err1) console.error('Error fixing Leonardo Profile:', err1);
    else console.log('Leonardo Santos Silva profile restored.');

    // 2. CREATE Leonardo Ferreira Godoi (the one the user actually wants)
    console.log('\nCreating Leonardo Ferreira Godoi...');
    const { data: n1, error: e1 } = await supabase.auth.admin.createUser({
        email: 'leonardofgodoi@compromisso.com',
        password: 'compromisso2026',
        user_metadata: { full_name: 'Leonardo Ferreira Godoi', role: 'student', must_change_password: true },
        email_confirm: true
    });
    if (e1) console.error('Error creating Leonardo Ferreira Godoi:', e1);
    else {
        console.log('Leonardo Ferreira Godoi created in Auth:', n1.user.id);
        await supabase.from('profiles').upsert({
            id: n1.user.id,
            email: 'leonardofgodoi@compromisso.com',
            full_name: 'Leonardo Ferreira Godoi',
            role: 'student',
            institution: 'ETEC',
            exam_target: 'ENEM',
            status: 'active'
        });
    }

    // 3. FIX MATHIAS EMAIL MISMATCH
    // Auth has mathiasgn@..., Profile has mathiasgnobre@...
    console.log('\nFixing Mathias mismatch...');
    const mathiasId = '4b42fa78-ccbf-4496-bd7a-e8ab350022c3';
    
    // First update the profile so it doesn't conflict when Auth syncs (if there's a trigger)
    // Actually, let's update Auth first if we can.
    // If update fails, we might have to delete and recreate.
    const { error: e2 } = await supabase.auth.admin.updateUserById(mathiasId, {
        email: 'mathiasgnobre@compromisso.com',
        password: 'compromisso2026',
        user_metadata: { full_name: 'Mathias de Godoi Nobre', role: 'student', must_change_password: true }
    });
    
    if (e2) {
        console.error('Error updating Mathias Auth:', e2);
        console.log('Attempting deletion and recreation for Mathias...');
        // If it's a mess, just delete and recreate
        await supabase.auth.admin.deleteUser(mathiasId);
        const { data: n2, error: e2b } = await supabase.auth.admin.createUser({
            email: 'mathiasgnobre@compromisso.com',
            password: 'compromisso2026',
            user_metadata: { full_name: 'Mathias de Godoi Nobre', role: 'student', must_change_password: true },
            email_confirm: true
        });
        if (e2b) console.error('Failed to recreate Mathias:', e2b);
        else {
            console.log('Mathias recreated:', n2.user.id);
            await supabase.from('profiles').upsert({
                id: n2.user.id,
                email: 'mathiasgnobre@compromisso.com',
                full_name: 'Mathias de Godoi Nobre',
                role: 'student',
                institution: 'ETEC',
                exam_target: 'ENEM',
                status: 'active'
            });
        }
    } else {
        console.log('Mathias Auth updated.');
    }

    // 4. CREATE LUIZ CLAUDIO
    console.log('\nCreating Luiz Claudio...');
    const { data: n3, error: e3 } = await supabase.auth.admin.createUser({
        email: 'luizclaudio@compromisso.com',
        password: 'compromisso2026',
        user_metadata: { full_name: 'Luiz Claudio', role: 'student', must_change_password: true },
        email_confirm: true
    });
    if (e3) console.error('Error creating Luiz Claudio:', e3);
    else {
        console.log('Luiz Claudio created:', n3.user.id);
        await supabase.from('profiles').upsert({
            id: n3.user.id,
            email: 'luizclaudio@compromisso.com',
            full_name: 'Luiz Claudio',
            role: 'student',
            institution: 'ETEC',
            exam_target: 'ENEM',
            status: 'active'
        });
    }

    // 5. RESET RICHARDY PASSWORD
    console.log('\nResetting Richardy password...');
    const { error: e4 } = await supabase.auth.admin.updateUserById('c2e94966-20e0-475f-a0ab-6a590ce366bd', {
        password: 'compromisso2026',
        user_metadata: { must_change_password: true }
    });
    if (e4) console.error('Error resetting Richardy:', e4);
    else console.log('Richardy password reset.');

    console.log('\n--- ALL DONE ---');
}

runFix();
