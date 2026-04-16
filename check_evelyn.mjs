
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function search(name) {
    console.log(`--- SEARCHING FOR: ${name} ---`);
    
    // Search in profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${name}%,name.ilike.%${name}%`);

    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }

    if (profiles && profiles.length > 0) {
        console.log(`Found in Profiles:`);
        profiles.forEach(p => console.log(`- ${p.full_name} (${p.email})`));
    } else {
        console.log('Not found in Profiles by full name.');
        
        // Try searching for parts
        const parts = name.split(' ').filter(p => p.length > 3);
        const orConditions = parts.map(p => `full_name.ilike.%${p}%`).join(',');
        const { data: partResults } = await supabase.from('profiles').select('*').or(orConditions);
        
        if (partResults && partResults.length > 0) {
            console.log(`Found partial matches:`);
            partResults.forEach(p => console.log(`- ${p.full_name} (${p.email})`));
        } else {
            console.log('No partial matches found.');
        }
    }

    // Auth check
    console.log('\nChecking Auth users by email pattern...');
    const emailPrefixMatch = name.toLowerCase().split(' ')[0];
    let page = 1;
    let foundAuth = [];
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        const matches = users.filter(u => u.email.includes(emailPrefixMatch) || (u.user_metadata && u.user_metadata.full_name && u.user_metadata.full_name.toLowerCase().includes(name.toLowerCase())));
        foundAuth = foundAuth.concat(matches);
        page++;
    }
    
    if (foundAuth.length > 0) {
        console.log(`Potential matches in Auth:`);
        foundAuth.forEach(u => console.log(`- Email: ${u.email}, ID: ${u.id}, Metadata: ${JSON.stringify(u.user_metadata)}`));
    } else {
        console.log('No potential matches in Auth.');
    }
}

search("Evelyn Silva dos Santos").catch(console.error);
