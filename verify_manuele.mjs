
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const targetName = "Manuele Santos Souza";

async function verify() {
    console.log(`--- VERIFYING STUDENT: ${targetName} ---`);

    // 1. Search in profiles table
    console.log(`Searching in profiles table...`);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%Manuele%`);

    if (profiles && profiles.length > 0) {
        console.log(`Matches for "Manuele" in profiles:`);
        profiles.forEach(p => {
            console.log(`- Name: ${p.full_name}, Email: ${p.email}, ID: ${p.id}, Role: ${p.role}`);
        });
    } else {
        console.log(`No matches for "Manuele" in profiles.`);
    }

    // 2. Search in Auth users
    console.log(`\nSearching in Auth users...`);
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

    const matches = allAuthUsers.filter(u => {
        const fullName = u.user_metadata?.full_name?.toLowerCase() || "";
        const email = u.email?.toLowerCase() || "";
        return fullName.includes("manuele") || email.includes("manuele");
    });

    if (matches.length > 0) {
        console.log(`Matches for "Manuele" in Auth:`);
        matches.forEach(u => {
            console.log(`- Metadata Name: ${u.user_metadata?.full_name}, Email: ${u.email}, ID: ${u.id}`);
        });
    } else {
        console.log(`No matches for "Manuele" in Auth.`);
    }
}

verify().catch(console.error);
