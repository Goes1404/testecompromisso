
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

async function findStudents() {
    const searchTerms = [
        'Leonardo Ferreira Godoi',
        'Richardy Lima da Costa',
        'Luiz Claudio',
        'Mathias de Godoi Nobre'
    ];

    console.log('--- Buscando na tabela PROFILES ---');
    for (const term of searchTerms) {
        const parts = term.split(' ');
        const firstName = parts[0];
        const lastName = parts[parts.length - 1];
        
        console.log(`\nBuscando por: ${term}`);
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${firstName}%,full_name.ilike.%${lastName}%,email.ilike.%${firstName}%`);

        if (error) {
            console.error('Erro ao buscar:', error);
        } else if (data && data.length > 0) {
            console.log(`Encontrados ${data.length} candidatos:`);
            data.forEach(p => console.log(`- ${p.full_name} (${p.email}) [ID: ${p.id}]`));
        } else {
            console.log('Nenhum resultado encontrado.');
        }
    }

    console.log('\n--- Buscando no AUTH (primeiros 1000) ---');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authError) {
        console.error('Erro ao listar Auth:', authError);
    } else {
        for (const term of searchTerms) {
            const parts = term.split(' ');
            const found = users.filter(u => 
                u.email.toLowerCase().includes(parts[0].toLowerCase()) || 
                (u.user_metadata?.full_name?.toLowerCase().includes(parts[0].toLowerCase()))
            );
            if (found.length > 0) {
                console.log(`\nPossíveis matches para ${term} no Auth:`);
                found.forEach(u => console.log(`- ${u.user_metadata?.full_name || 'N/A'} (${u.email}) [ID: ${u.id}]`));
            }
        }
    }
}

findStudents();
