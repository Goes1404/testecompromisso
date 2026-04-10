
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

// Extract data from gen_full_list.js content
const listPath = path.resolve(process.cwd(), 'gen_full_list.js');
const listContent = fs.readFileSync(listPath, 'utf8');

function extractRawData(content, startMarker, endMarker) {
    const start = content.indexOf(startMarker) + startMarker.length;
    const end = content.indexOf(endMarker, start);
    return content.substring(start, end).trim();
}

const rawEnem = extractRawData(listContent, 'const RawDataENEM = `', '`;');
const rawEtec = extractRawData(listContent, 'const RawDataETEC = `', '`;');

function parseStudents(raw, type) {
    const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result = [];
    for(let i=0; i < lines.length; i += 2) {
        const name = lines[i];
        const school = lines[i+1] || 'Colégio Colaço';
        if (name) {
            result.push({ name, school, type });
        }
    }
    return result;
}

const students = [
    ...parseStudents(rawEnem, 'enem'),
    ...parseStudents(rawEtec, 'etec')
];

console.log(`Carregados ${students.length} registros de alunos.`);

// Deduplicate by Name + School
const uniqueStudentsMap = new Map();
students.forEach(s => {
    const key = `${s.name.trim().toLowerCase()}|${s.school.trim().toLowerCase()}`;
    if (!uniqueStudentsMap.has(key)) {
        uniqueStudentsMap.set(key, s);
    }
});

const uniqueStudents = Array.from(uniqueStudentsMap.values());
console.log(`Identificados ${uniqueStudents.size || uniqueStudents.length} alunos únicos (por nome e escola).`);

async function runSync() {
    console.log('Obtendo lista atual de usuários no Auth...');
    let allAuthUsers = [];
    let page = 1;
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        allAuthUsers = allAuthUsers.concat(users);
        page++;
    }
    
    // Map of email -> user
    const emailToUser = new Map(allAuthUsers.map(u => [u.email.toLowerCase(), u]));
    // Set of all used emails (including newly generated ones)
    const usedEmails = new Set(allAuthUsers.map(u => u.email.toLowerCase()));
    
    // Track name -> email mapping to reuse same email for same person 
    // (though they should already be unique in uniqueStudents)
    
    console.log(`Sincronizando ${uniqueStudents.length} alunos...`);

    for (let i = 0; i < uniqueStudents.length; i++) {
        const s = uniqueStudents[i];
        
        // Generate a candidate email
        const nameParts = s.name.trim().split(' ').filter(p => p.length > 0);
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        let secondInitial = nameParts.length > 1 ? nameParts[1][0] : '';
        
        let emailPart = (firstName + secondInitial + lastName)
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
        
        let targetEmail = `${emailPart}@compromisso.com`;
        
        // COLLISION RESOLUTION
        // check if this email exists and if it belongs to someone ELSE
        let existingUser = emailToUser.get(targetEmail);
        
        if (existingUser && existingUser.user_metadata?.full_name?.toLowerCase() !== s.name.toLowerCase()) {
            // Collision! Different person with same generated email
            let counter = 2;
            while (true) {
                targetEmail = `${emailPart}${counter}@compromisso.com`;
                existingUser = emailToUser.get(targetEmail);
                if (!existingUser) break; // found an empty slot
                if (existingUser.user_metadata?.full_name?.toLowerCase() === s.name.toLowerCase()) break; // slot belongs to same person
                counter++;
            }
        }

        try {
            let userId;
            if (existingUser) {
                // Update
                const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                    password: STANDARD_PASSWORD,
                    user_metadata: {
                        ...existingUser.user_metadata,
                        full_name: s.name,
                        profile_type: 'student',
                        exam_target: s.type,
                        institution: s.school,
                        must_change_password: true
                    }
                });
                if (updateError) console.error(`[${i+1}] ❌ Erro update ${targetEmail}: ${updateError.message}`);
                userId = existingUser.id;
            } else {
                // Create
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: targetEmail,
                    password: STANDARD_PASSWORD,
                    email_confirm: true,
                    user_metadata: {
                        full_name: s.name,
                        profile_type: 'student',
                        exam_target: s.type,
                        institution: s.school,
                        must_change_password: true
                    }
                });
                
                if (createError) {
                    console.error(`[${i+1}] ❌ Erro creation ${targetEmail}: ${createError.message}`);
                    continue;
                }
                userId = newUser.user.id;
                emailToUser.set(targetEmail, newUser.user);
                console.log(`[${i+1}] ✨ Novo: ${targetEmail} (${s.name})`);
            }
            
            // ALWAYS UPSERT PROFILE
            await supabase.from('profiles').upsert({
                id: userId,
                email: targetEmail,
                name: s.name,
                full_name: s.name,
                profile_type: 'student',
                exam_target: s.type,
                institution: s.school,
                status: 'active'
            });

            if ((i + 1) % 50 === 0) console.log(`Progresso: ${i + 1}/${uniqueStudents.length}...`);

        } catch (err) {
            console.error(`[${i+1}] 💥 Falha fatal em ${s.name}:`, err);
        }
    }

    console.log('--- SINCRONIZAÇÃO COMPLETA CONCLUÍDA ---');
}

runSync();
