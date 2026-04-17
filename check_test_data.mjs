
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

async function checkTestData() {
    const email = 'aluno@compromisso.com';
    console.log(`Checking data for ${email}...`);
    
    const { data: profile } = await supabase.from('profiles').select('*').ilike('email', email).single();
    if (!profile) {
        console.log('Profile NOT found.');
        return;
    }
    const userId = profile.id;
    console.log(`User ID: ${userId}`);

    const [essayCount, examCount, progressCount] = await Promise.all([
        supabase.from('essay_submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('simulation_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ]);

    console.log(`Essays: ${essayCount.count}`);
    console.log(`Exams: ${examCount.count}`);
    console.log(`Progress: ${progressCount.count}`);
}

checkTestData();
