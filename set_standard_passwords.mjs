
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

async function updateAllPasswords() {
    console.log('--- INICIANDO ATUALIZAÇÃO DE SENHA PADRÃO (compromisso2026) ---');
    let page = 1;
    let allUsers = [];
    
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page,
            perPage: 1000
        });
        
        if (error) {
            console.error('Erro ao listar usuários:', error);
            break;
        }
        
        if (users.length === 0) break;
        allUsers = allUsers.concat(users);
        page++;
    }
    
    const students = allUsers.filter(u => u.user_metadata?.profile_type === 'student');
    console.log(`Encontrados ${students.length} alunos para atualizar.`);
    
    for (const [index, user] of students.entries()) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: STANDARD_PASSWORD,
            user_metadata: { 
                ...user.user_metadata,
                must_change_password: true // Força a troca no primeiro acesso por segurança
            }
        });
        
        if (updateError) {
            console.error(`[${index + 1}/${students.length}] ❌ Erro ${user.email}: ${updateError.message}`);
        } else {
            console.log(`[${index + 1}/${students.length}] ✅ Atualizado: ${user.email}`);
        }
    }
    console.log('--- ATUALIZAÇÃO CONCLUÍDA ---');
}

updateAllPasswords();
