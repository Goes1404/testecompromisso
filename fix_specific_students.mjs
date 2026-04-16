
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
    { name: 'Luiz Cláudio', email: 'luizclaudio@compromisso.com' },
    { name: 'Mathias de Godoi Nobre', email: 'mathiasgnobre@compromisso.com' }
];

async function fixStudents() {
    for (const student of studentsToFix) {
        console.log(`\n--- Processando: ${student.name} (${student.email}) ---`);
        
        // 1. Check Auth
        let { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        // Since there might be many users, we should use search or pagination, but for simplicity let's search by email
        // Actually listUsers doesn't support filtering by email easily in some versions, but we can iterate.
        // Or better, try to create and catch "already exists" error.
        
        let existingAuth = null;
        let page = 1;
        while(true) {
            const { data: { users: pageUsers }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
            if (error || !pageUsers || pageUsers.length === 0) break;
            existingAuth = pageUsers.find(u => u.email.toLowerCase() === student.email.toLowerCase());
            if (existingAuth) break;
            page++;
        }

        if (!existingAuth) {
            // Also check for similar emails just in case (like mathiasgn vs mathiasgnobre)
            const prefix = student.email.split('@')[0].substring(0, 7);
            const { data: { users: similarUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const possibleMatch = similarUsers.find(u => u.email.toLowerCase().includes(prefix));
            if (possibleMatch) {
                console.log(`! Possível match encontrado com email diferente: ${possibleMatch.email}`);
                existingAuth = possibleMatch;
            }
        }

        let userId;
        if (existingAuth) {
            console.log(`Usuário já existe no Auth: ${existingAuth.id} (${existingAuth.email})`);
            userId = existingAuth.id;
            
            // Update email if it was different? Or just verify metadata.
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                email: student.email,
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
            institution: 'ETEC', // Defaulting to ETEC as they seem to be from the new batch
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
