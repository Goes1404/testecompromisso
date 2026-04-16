
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '9c948784-a37d-49ce-9c6c-324ba451f9b6')
        .single();
    
    console.log("Profile Table Data:");
    console.log(JSON.stringify(profile, null, 2));
}

check().catch(console.error);
