
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

async function checkActualData() {
    const userId = 'cca86ded-1c50-4f7d-909c-f3ba2223068e';
    const { data, error } = await supabase.from('simulation_attempts').select('*').eq('user_id', userId);
    console.log('Simulation Attempts:', data);
    
    const { data: essays } = await supabase.from('essay_submissions').select('*').eq('user_id', userId);
    console.log('Essays:', essays);
}

checkActualData();
