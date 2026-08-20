import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load env
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findStudent() {
    const name = 'Gabriel Antônio de Azevedo Fonseca';
    console.log(`Searching for student: ${name}`);
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', `%${name}%`);
        
    if (error) {
        console.error('Error searching:', error);
        return;
    }
    
    if (data && data.length > 0) {
        console.log('Found student(s):', data.map(p => ({ id: p.id, name: p.name, email: p.email, institution: p.institution, sala: p.sala, periodo: p.periodo })));
    } else {
        console.log('Student not found.');
        
        // Search for partial name
        const partialName = 'Gabriel Antônio';
        console.log(`Searching for partial name: ${partialName}`);
        const { data: partialData } = await supabase
            .from('profiles')
            .select('*')
            .ilike('name', `%${partialName}%`);
        console.log('Found partial matches:', partialData?.map(p => ({ id: p.id, name: p.name, email: p.email })));
    }
}

findStudent();
