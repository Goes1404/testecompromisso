
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function search() {
    console.log(`--- SEARCHING FOR CORE NAME: Rakelly ---`);
    
    // Search in profiles table for "Rakelly"
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%Rakelly%`);

    if (profileError) {
        console.error(`Error searching profiles: ${profileError.message}`);
    } else if (profiles && profiles.length > 0) {
        console.log(`Found in profiles table:`);
        profiles.forEach(p => {
            console.log(`- Name: ${p.full_name}, Email: ${p.email}, ID: ${p.id}, Role: ${p.role}`);
        });
    } else {
        console.log('No matches found for "Rakelly" in profiles.');
    }

    console.log(`\n--- SEARCHING FOR CORE NAME: Luiza ---`);
    const { data: profilesLuiza, error: profileErrorLuiza } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%Luiza%`);

    if (profilesLuiza && profilesLuiza.length > 0) {
        console.log(`Found in profiles table:`);
        profilesLuiza.forEach(p => {
            console.log(`- Name: ${p.full_name}, Email: ${p.email}, ID: ${p.id}, Role: ${p.role}`);
        });
    } else {
        console.log('No matches found for "Luiza" in profiles.');
    }
}

search().catch(console.error);
