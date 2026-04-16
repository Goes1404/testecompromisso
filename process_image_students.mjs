
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateEmail(name) {
    const nameParts = name.trim().split(' ').filter(p => p.length > 0);
    if (nameParts.length === 0) return '';
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    let secondNameInitial = '';
    if (nameParts.length >= 3) {
        secondNameInitial = nameParts[1][0].toLowerCase();
    }
    const emailPart = (firstName + secondNameInitial + (nameParts.length > 1 ? lastName : ''))
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    return `${emailPart}@compromisso.com`;
}

const targetStudents = [
    { name: "Júlia Marques Franco", action: "criar email", notes: "Colaço, ENEM, sala: 08" },
    { name: "Rhara Ruas", action: "verificar se já existe" },
    { name: "Mathias G nobre", action: "não está conseguindo entrar na plataforma" },
    { name: "Thiago Vieira Martins", action: "não está conseguindo entrar na plataforma" },
    { name: "Kamile Rafaela Scomparim da Silva", action: "verificar se já existe" }
];

async function processStudents() {
    console.log('--- PROCESSING STUDENTS FROM IMAGE ---');
    
    // Load ALL auth users to handle duplicates correctly
    let allAuthUsers = [];
    let page = 1;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        allAuthUsers = allAuthUsers.concat(users);
        page++;
    }
    const authMap = new Map(allAuthUsers.map(u => [u.email.toLowerCase(), u]));

    for (const student of targetStudents) {
        const email = generateEmail(student.name);
        console.log(`\nStudent: ${student.name}`);
        console.log(`Potential Email: ${email}`);
        console.log(`Action: ${student.action}`);
        
        const existingAuth = authMap.get(email.toLowerCase());
        const { data: profile } = await supabase.from('profiles').select('*').ilike('email', email).single();

        if (existingAuth) {
            console.log(`- FOUND in Auth (ID: ${existingAuth.id})`);
            console.log(`- Metadata: ${JSON.stringify(existingAuth.user_metadata)}`);
        } else {
            console.log(`- NOT found in Auth`);
        }

        if (profile) {
            console.log(`- FOUND in Profiles table`);
            console.log(`- Profile Data: ${JSON.stringify(profile)}`);
        } else {
            console.log(`- NOT found in Profiles table`);
        }

        // Special handling for Júlia (criar email)
        if (student.name === "Júlia Marques Franco" && !existingAuth) {
            console.log("Creating account for Júlia Marques Franco...");
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: 'compromisso2026',
                email_confirm: true,
                user_metadata: {
                    full_name: student.name,
                    display_name: student.name,
                    role: 'student',
                    profile_type: 'student',
                    school: 'Colaço',
                    study_focus: 'ENEM',
                    room: 'sala: 08',
                    must_change_password: true
                }
            });
            if (createError) {
                console.error(`Error creating Júlia: ${createError.message}`);
            } else {
                console.log(`Account created for Júlia! ID: ${newUser.user.id}`);
                // Upsert Profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: newUser.user.id,
                        email: email,
                        full_name: student.name,
                        name: student.name,
                        institution: 'Colaço',
                        exam_target: 'ENEM',
                        profile_type: 'student',
                        status: 'active',
                        updated_at: new Date()
                    });
                if (profileError) console.error(`Error creating Júlia profile: ${profileError.message}`);
            }
        }

        // Special handling for those who can't enter (reset password)
        if (student.action.includes("não está conseguindo entrar") && existingAuth) {
            console.log(`Resetting password to 'compromisso2026' for ${student.name}...`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuth.id, {
                password: 'compromisso2026',
                user_metadata: {
                    ...existingAuth.user_metadata,
                    must_change_password: true
                }
            });
            if (updateError) {
                console.error(`Error resetting password for ${student.name}: ${updateError.message}`);
            } else {
                console.log(`Password reset for ${student.name}!`);
            }
        }
    }
}

processStudents().catch(console.error);
