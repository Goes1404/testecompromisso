
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('--- VERIFYING FINAL STATUS ---');
    const students = [
        { name: "Júlia Marques Franco", email: "juliamfranco@compromisso.com" },
        { name: "Rhara Ruas", email: "rhararuas@compromisso.com" },
        { name: "Mathias G nobre", email: "mathiasgn@compromisso.com" },
        { name: "Thiago Vieira Martins", email: "thiagovm@compromisso.com" },
        { name: "Kamile Rafaela Scomparim da Silva", email: "kamilesilva@compromisso.com" }
    ];

    for (const s of students) {
        console.log(`\nVerifying ${s.name} (${s.email})...`);
        const { data: profile } = await supabase.from('profiles').select('*').ilike('email', s.email).single();
        if (profile) {
            console.log(`- Profile OK. Full Name: ${profile.full_name}, Email: ${profile.email}`);
        } else {
            console.log(`- Profile MISSING!`);
        }
    }
}

verify().catch(console.error);
