
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

async function seedTestData() {
    const userId = 'cca86ded-1c50-4f7d-909c-f3ba2223068e';
    console.log(`Seeding mock data for ${userId}...`);

    // 1. Get a subjects and trails to link
    const { data: subjects } = await supabase.from('subjects').select('id').limit(1);
    const { data: trails } = await supabase.from('trails').select('id').limit(2);
    
    if (!subjects || !trails) {
        console.error('Core data missing to seed.');
        return;
    }

    const subjectId = subjects[0].id;

    // 2. Clear old test data if any
    await supabase.from('simulation_attempts').delete().eq('user_id', userId);
    await supabase.from('essay_submissions').delete().eq('user_id', userId);
    await supabase.from('user_progress').delete().eq('user_id', userId);

    // 3. Seed Simulation Attempts (Evolução de Acertos)
    const simulations = [
        { user_id: userId, subject_id: subjectId, score: 3, total_questions: 10, created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
        { user_id: userId, subject_id: subjectId, score: 5, total_questions: 10, created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString() },
        { user_id: userId, subject_id: subjectId, score: 8, total_questions: 10, created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString() },
        { user_id: userId, subject_id: subjectId, score: 9, total_questions: 10, created_at: new Date().toISOString() }
    ];
    await supabase.from('simulation_attempts').insert(simulations);

    // 4. Seed Essays (Evolução de Redação)
    const essays = [
        { 
            user_id: userId, 
            theme: 'Impactos da IA na Educação', 
            content: 'Texto longo...', 
            score: 520, 
            status: 'reviewed', 
            feedback: 'Bom início, mas melhore a tese.',
            created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
        },
        { 
            user_id: userId, 
            theme: 'Mobilidade Urbana em Parnaíba', 
            content: 'Texto longo...', 
            score: 740, 
            status: 'reviewed', 
            feedback: 'Ótima proposta de intervenção.',
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        { 
            user_id: userId, 
            theme: 'Insegurança Alimentar', 
            content: 'Texto longo...', 
            score: 880, 
            status: 'reviewed', 
            feedback: 'Excelente domínio da norma culta.',
            created_at: new Date().toISOString()
        }
    ];
    await supabase.from('essay_submissions').insert(essays);

    // 5. Seed Progress
    const progress = [
        { user_id: userId, trail_id: trails[0].id, percentage: 45, last_accessed: new Date().toISOString() },
        { user_id: userId, trail_id: trails[1].id, percentage: 12, last_accessed: new Date().toISOString() }
    ];
    await supabase.from('user_progress').insert(progress);

    console.log('Seeding COMPLETE. The dashboard should now look alive.');
}

seedTestData();
