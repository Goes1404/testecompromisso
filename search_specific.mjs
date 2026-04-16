
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
    { name: "Thiago Vieira Martins" }
];

async function search() {
    console.log('--- SPECIFIC SEARCH ---');
    for (const student of targetStudents) {
        console.log(`\nSearching for parts of: ${student.name}`);
        const parts = student.name.split(' ').filter(p => p.length > 2);
        
        for (const part of parts) {
            console.log(`Searching for "${part}"...`);
            const { data: results, error } = await supabase.from('profiles').select('*').ilike('full_name', `%${part}%`);
            if (results && results.length > 0) {
                results.forEach(r => console.log(`- ${r.full_name} (${r.email})`));
            } else {
                console.log(`No results for "${part}"`);
            }
        }
    }
}

search().catch(console.error);
