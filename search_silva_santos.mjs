
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function search() {
    const { data: results } = await supabase.from('profiles').select('*').ilike('full_name', '%Silva dos Santos%');
    if (results && results.length > 0) {
        results.forEach(r => console.log(`- ${r.full_name} (${r.email})`));
    } else {
        console.log('No matches for "Silva dos Santos"');
    }
}

search().catch(console.error);
