
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

async function verifyAll() {
    const students = [
        { name: 'Leonardo Ferreira Godoi', email: 'leonardofgodoi_new@compromisso.com' },
        { name: 'Richardy Lima da Costa', email: 'richardylcosta@compromisso.com' },
        { name: 'Luiz Claudio', email: 'luizclaudio_new@compromisso.com' },
        { name: 'Mathias de Godoi Nobre', email: 'mathiasgnobre_new@compromisso.com' }
    ];

    console.log('--- VERIFICAÇÃO FINAL ---');
    for (const student of students) {
        console.log(`\nEstudante: ${student.name}`);
        
        // Auth check
        const { data: { users }, error: aError } = await supabase.auth.admin.listUsers();
        const authUser = users.find(u => u.email.toLowerCase() === student.email.toLowerCase());
        
        if (authUser) {
            console.log(`[OK] Auth: Encontrado (ID: ${authUser.id})`);
        } else {
            console.log(`[!!] Auth: NÃO ENCONTRADO para email ${student.email}`);
        }

        // Profile check
        const { data: profile, error: pError } = await supabase.from('profiles').select('*').ilike('email', student.email).single();
        if (profile) {
            console.log(`[OK] Profile: Encontrado (ID: ${profile.id}, Nome: ${profile.full_name})`);
        } else {
            console.log(`[!!] Profile: NÃO ENCONTRADO para email ${student.email}`);
        }
    }
}

verifyAll();
