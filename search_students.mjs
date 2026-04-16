
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const targetStudents = [
    { name: "Mathias G nobre" },
    { name: "Thiago Vieira Martins" },
    { name: "Kamile Rafaela Scomparim da Silva" }
];

async function search() {
    console.log('--- SEARCHING BY NAME ---');
    for (const student of targetStudents) {
        console.log(`\nSearching for: ${student.name}`);
        
        // Split name into parts to search for each part
        const parts = student.name.split(' ').filter(p => p.length > 2); // only parts longer than 2 chars
        
        let query = supabase.from('profiles').select('*');
        
        // Search for profiles where the full_name contains any of the parts
        const orConditions = parts.map(p => `full_name.ilike.%${p}%`).join(',');
        const { data: results, error } = await query.or(orConditions);

        if (error) {
            console.error(`Error searching for ${student.name}: ${error.message}`);
            continue;
        }

        if (results && results.length > 0) {
            console.log(`Found ${results.length} results:`);
            results.forEach(r => {
                console.log(`- ${r.full_name} (${r.email}) [ID: ${r.id}]`);
            });
        } else {
            console.log('No results found for name parts.');
        }
    }
}

search().catch(console.error);
