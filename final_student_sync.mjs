
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
const STANDARD_PASSWORD = "compromisso2026";

async function runFinalBatch() {
    console.log('--- INICIANDO VARREDURA E CONCLUSÃO FINAL 702 ALUNOS ---');
    
    // 1. Read full list
    const content = fs.readFileSync('full_student_list_grouped.md', 'utf8');
    const lines = content.split('\n').filter(l => l.includes('|') && !l.includes('Email'));
    const studentsData = lines.map(l => {
        const parts = l.split('|');
        return {
            name: parts[0].trim(),
            email: parts[1].trim(),
            school: parts[2]?.trim() || 'Colégio Colaço',
            type: parts[3]?.trim()?.toLowerCase() || 'enem'
        };
    });

    console.log(`Lista mestre carregada: ${studentsData.length} nomes.`);

    for (const [index, student] of studentsData.entries()) {
        const { email, name, school, type } = student;
        
        // Try to update existing first
        const { data: userData, error: findError } = await supabase.auth.admin.listUsers(); // Simple fallback check
        // Optimistic update: let's try to update by email indirectly or check if exists
        // Actually, we'll try to get the profile by email to get the ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .single();

        if (profile) {
            // Update existing Auth user
            const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
                password: STANDARD_PASSWORD,
                user_metadata: {
                    full_name: name,
                    profile_type: 'student',
                    exam_target: type,
                    institution: school,
                    must_change_password: true
                }
            });
            if (updateError) console.error(`[${index + 1}] ❌ Erro Update ${email}: ${updateError.message}`);
            else console.log(`[${index + 1}] ✅ Senha OK: ${email}`);
        } else {
            // Create New Auth User
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password: STANDARD_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    full_name: name,
                    profile_type: 'student',
                    exam_target: type,
                    institution: school,
                    must_change_password: true
                }
            });

            if (createError) {
                console.error(`[${index + 1}] ❌ Erro Criação ${email}: ${createError.message}`);
            } else {
                // Upsert Profile
                await supabase.from('profiles').upsert({
                    id: newUser.user.id,
                    name,
                    email,
                    profile_type: 'student',
                    exam_target: type,
                    institution: school,
                    status: 'active'
                });
                console.log(`[${index + 1}] ✨ Criado e Configurado: ${email}`);
            }
        }
    }
    console.log('--- OPERAÇÃO FINAL CONCLUÍDA ---');
}

runFinalBatch();
