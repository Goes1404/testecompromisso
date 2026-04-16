
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const targetName = "Luiza Rakelly Gonçalves Silva";

async function search() {
    console.log(`--- SEARCHING FOR: ${targetName} ---`);
    
    // Search in profiles table
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${targetName}%`);

    if (profileError) {
        console.error(`Error searching profiles: ${profileError.message}`);
    } else if (profiles && profiles.length > 0) {
        console.log(`Found in profiles table:`);
        profiles.forEach(p => {
            console.log(`- Name: ${p.full_name}, Email: ${p.email}, ID: ${p.id}, Role: ${p.role}`);
        });
    } else {
        console.log('Not found in profiles table with exact name. Trying partial match...');
        
        const parts = targetName.split(' ').filter(p => p.length > 3);
        const orConditions = parts.map(p => `full_name.ilike.%${p}%`).join(',');
        const { data: partialResults, error: partialError } = await supabase
            .from('profiles')
            .select('*')
            .or(orConditions);
            
        if (partialError) {
            console.error(`Error searching partial profiles: ${partialError.message}`);
        } else if (partialResults && partialResults.length > 0) {
            console.log(`Found partial matches in profiles:`);
            partialResults.forEach(p => {
                console.log(`- Name: ${p.full_name}, Email: ${p.email}, ID: ${p.id}, Role: ${p.role}`);
            });
        } else {
            console.log('No matches found in profiles table.');
        }
    }

    // Also check Auth users directly
    console.log(`\n--- SEARCHING AUTH USERS ---`);
    let allAuthUsers = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 });
        if (error || !users || users.length === 0) {
            hasMore = false;
        } else {
            allAuthUsers = [...allAuthUsers, ...users];
            page++;
        }
    }

    const nameParts = targetName.toLowerCase().split(' ').filter(p => p.length > 3);
    const authMatches = allAuthUsers.filter(u => {
        const metadataName = u.user_metadata?.full_name?.toLowerCase() || "";
        const email = u.email?.toLowerCase() || "";
        return nameParts.every(part => metadataName.includes(part) || email.includes(part));
    });

    if (authMatches.length > 0) {
        console.log(`Found in Auth:`);
        authMatches.forEach(u => {
            console.log(`- Email: ${u.email}, ID: ${u.id}, Metadata Name: ${u.user_metadata?.full_name}`);
        });
    } else {
        console.log('No matches found in Auth users.');
    }
}

search().catch(console.error);
