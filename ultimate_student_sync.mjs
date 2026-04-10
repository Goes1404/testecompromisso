
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

async function runUltimateSync() {
    console.log('--- INICIANDO SINCRONIZAÇÃO COMPLETA (META: 702+ ALUNOS) ---');
    
    if (!fs.existsSync('full_student_list_grouped.md')) {
        console.error('Arquivo full_student_list_grouped.md não encontrado!');
        return;
    }

    const content = fs.readFileSync('full_student_list_grouped.md', 'utf8');
    const lines = content.split('\n');
    
    let currentType = 'enem';
    const students = [];
    
    for (const line of lines) {
        if (line.includes('## Alunos ETEC')) currentType = 'etec';
        if (line.includes('## Alunos ENEM')) currentType = 'enem';
        
        if (line.includes('|') && !line.includes('Nome') && !line.includes('---')) {
            const parts = line.split('|').map(p => p.trim());
            // Format: | Name | Email |
            if (parts.length >= 3) {
                const name = parts[1];
                const email = parts[2];
                if (email && email.includes('@')) {
                    students.push({ name, email, type: currentType });
                }
            }
        }
    }

    console.log(`Carregados ${students.length} alunos do arquivo.`);

    // Get all current users to avoid redundant checks if possible, or just upsert
    console.log('Obtendo lista atual de usuários...');
    let allUsers = [];
    let page = 1;
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page,
            perPage: 1000
        });
        if (error || !users || users.length === 0) break;
        allUsers = allUsers.concat(users);
        page++;
    }
    const userMap = new Map(allUsers.map(u => [u.email.toLowerCase(), u]));

    console.log(`Sincronizando ${students.length} alunos...`);

    for (let i = 0; i < students.length; i++) {
        const s = students[i];
        const email = s.email.toLowerCase();
        const existingUser = userMap.get(email);
        
        try {
            if (existingUser) {
                // Update
                const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                    password: STANDARD_PASSWORD,
                    user_metadata: {
                        ...existingUser.user_metadata,
                        full_name: s.name,
                        profile_type: 'student',
                        exam_target: s.type,
                        must_change_password: true
                    }
                });
                
                if (updateError) {
                    console.error(`[${i+1}/${students.length}] ❌ Erro update ${email}: ${updateError.message}`);
                } else {
                    // console.log(`[${i+1}/${students.length}] ✅ OK: ${email}`);
                }
            } else {
                // Create
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: s.email,
                    password: STANDARD_PASSWORD,
                    email_confirm: true,
                    user_metadata: {
                        full_name: s.name,
                        profile_type: 'student',
                        exam_target: s.type,
                        must_change_password: true
                    }
                });
                
                if (createError) {
                    console.error(`[${i+1}/${students.length}] ❌ Erro creation ${email}: ${createError.message}`);
                } else {
                    console.log(`[${i+1}/${students.length}] ✨ Novo Aluno: ${email}`);
                    // Profile will be synced by Auth trigger or we do it manually
                    await supabase.from('profiles').upsert({
                        id: newUser.user.id,
                        email: s.email,
                        name: s.name,
                        profile_type: 'student',
                        exam_target: s.type,
                        status: 'active'
                    });
                }
            }
            
            // Log progress every 50 users
            if ((i + 1) % 50 === 0) {
                console.log(`Progresso: ${i + 1}/${students.length}...`);
            }
            
        } catch (err) {
            console.error(`[${i+1}/${students.length}] 💥 Falha fatal em ${email}:`, err);
        }
    }

    console.log('--- SINCRONIZAÇÃO CONCLUÍDA ---');
}

runUltimateSync();
