
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const missingStudents = [
    { name: "Mathias G nobre", email: "mathiasgnobre@compromisso.com", institution: "ETEC", exam_target: "ETEC" },
    { name: "Thiago Vieira Martins", email: "thiagovmartins@compromisso.com", institution: "ETEC", exam_target: "ETEC" }
];

async function finalize() {
    console.log('--- FINALIZING STUDENT REGISTRATION ---');

    for (const s of missingStudents) {
        console.log(`Creating account for ${s.name} (${s.email})...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: s.email,
            password: 'compromisso2026',
            email_confirm: true,
            user_metadata: {
                full_name: s.name,
                display_name: s.name,
                role: 'student',
                profile_type: 'student',
                school: s.institution,
                study_focus: s.exam_target,
                must_change_password: true
            }
        });

        if (createError) {
            console.error(`Error creating ${s.name}: ${createError.message}`);
            continue;
        }

        console.log(`Account created! ID: ${newUser.user.id}`);

        // Upsert Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                email: s.email,
                full_name: s.name,
                name: s.name,
                institution: s.institution,
                exam_target: s.exam_target,
                profile_type: 'student',
                status: 'active',
                updated_at: new Date()
            });
        
        if (profileError) console.error(`Error creating profile for ${s.name}: ${profileError.message}`);
    }

    // Update Júlia Marques Franco's metadata just in case
    console.log("\nUpdating Júlia Marques Franco's metadata...");
    const { data: juliaAuth } = await supabase.auth.admin.listUsers(); // Simple list to find her (already checked her ID before)
    const juliaId = "ca6edf86-9598-41cb-986b-484039082e2e";
    
    await supabase.auth.admin.updateUserById(juliaId, {
        user_metadata: {
            full_name: "Júlia Marques Franco",
            display_name: "Júlia Marques Franco",
            role: 'student',
            profile_type: 'student',
            school: 'Colaço',
            study_focus: 'ENEM',
            room: '08',
            must_change_password: true
        }
    });
    
    await supabase.from('profiles').update({
        institution: 'Colaço',
        exam_target: 'ENEM',
        full_name: "Júlia Marques Franco",
        name: "Júlia Marques Franco"
    }).eq('id', juliaId);

    console.log("Júlia's profile updated.");
}

finalize().catch(console.error);
