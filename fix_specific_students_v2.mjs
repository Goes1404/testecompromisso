
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

const studentsToFix = [
    { name: 'Leonardo Ferreira Godoi', email: 'leonardofgodoi@compromisso.com' },
    { name: 'Richardy Lima da Costa', email: 'richardylcosta@compromisso.com' },
    { name: 'Luiz Claudio', email: 'luizclaudio@compromisso.com' }, // Removed accent for better matching
    { name: 'Mathias de Godoi Nobre', email: 'mathiasgnobre@compromisso.com' }
];

async function fixStudents() {
    for (const student of studentsToFix) {
        console.log(`\n--- Processando: ${student.name} (${student.email}) ---`);
        
        // 1. Check Auth EXACT EMAIL
        let foundAuth = null;
        let page = 1;
        while(true) {
            const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
            if (error || !users || users.length === 0) break;
            foundAuth = users.find(u => u.email.toLowerCase() === student.email.toLowerCase());
            if (foundAuth) break;
            page++;
        }

        let userId;
        if (foundAuth) {
            console.log(`Usuário encontrado no Auth: ${foundAuth.id}`);
            userId = foundAuth.id;
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                password: 'compromisso2026',
                user_metadata: {
                    full_name: student.name,
                    role: 'student',
                    must_change_password: true
                },
                email_confirm: true
            });
            if (updateError) console.error('Erro ao atualizar Auth:', updateError);
            else console.log('Auth atualizado com sucesso.');
        } else {
            console.log('Criando novo usuário no Auth...');
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: student.email,
                password: 'compromisso2026',
                user_metadata: {
                    full_name: student.name,
                    role: 'student',
                    must_change_password: true
                },
                email_confirm: true
            });
            if (createError) {
                console.error('Erro ao criar Auth:', createError);
                // If create fails, maybe it exists with a different ID?
                continue;
            }
            userId = newUser.user.id;
            console.log('Usuário criado no Auth:', userId);
        }

        // 2. Sync with Profiles table
        const profileData = {
            id: userId,
            email: student.email,
            full_name: student.name,
            role: 'student',
            institution: 'ETEC',
            exam_target: 'ENEM',
            updated_at: new Date()
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData);

        if (profileError) console.error('Erro ao sincronizar Tabela Profiles:', profileError);
        else console.log('Tabela Profiles sincronizada.');
    }
}

fixStudents();
