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

async function updateGabrielProfile() {
    const userId = 'a2b53537-2781-4628-990f-3f71cf4e91fe';
    const name = 'Gabriel Antônio de Azevedo Fonseca';
    const institution = 'Ulysses Silveira Guimarães';
    const sala = 'sala 1';
    const periodo = 'manhã';
    const examTarget = 'ETEC';

    console.log(`Updating profile for Gabriel (ID: ${userId})...`);

    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            name: name,
            full_name: name,
            institution: institution,
            sala: sala,
            periodo: periodo,
            role: 'student',
            profile_type: 'Aluno',
            course: examTarget,
            exam_target: examTarget,
            status: 'active'
        })
        .eq('id', userId);

    if (profileError) {
        console.error('Error updating profile:', profileError);
        return;
    }

    console.log('Profile updated successfully.');
}

updateGabrielProfile();
