
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function checkBianca() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', '%Bianca%Souza%Freitas%');
    
    if (error) {
        console.error('Error fetching Bianca:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No profile found for Bianca Souza de Freitas.');
        // Try searching by just name parts
        const { data: data2 } = await supabase.from('profiles').select('*').ilike('name', '%Bianca%Freitas%');
        console.log('Search by "Bianca Freitas":', data2);
    } else {
        console.log('Found profile:', data);
    }
}

checkBianca();
