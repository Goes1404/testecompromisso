
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

async function syncAllUsers() {
    console.log('--- INICIANDO SINCRONIZAÇÃO TOTAL AUTH -> PROFILES ---');
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
    
    console.log(`Encontrados ${allUsers.length} usuários no Auth.`);
    
    for (const user of allUsers) {
        if (user.user_metadata?.profile_type === 'student') {
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    name: user.user_metadata.full_name || 'Estudante',
                    email: user.email,
                    profile_type: 'student',
                    exam_target: user.user_metadata.exam_target,
                    institution: user.user_metadata.institution,
                    status: 'active'
                });
            
            if (upsertError) {
                console.error(`- ❌ Erro no perfil de ${user.email}: ${upsertError.message}`);
            } else {
                console.log(`- ✅ Sincronizado: ${user.email}`);
            }
        }
    }
    console.log('--- SINCRONIZAÇÃO CONCLUÍDA ---');
}

syncAllUsers();
