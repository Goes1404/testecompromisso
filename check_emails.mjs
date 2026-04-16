
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExactEmail(email) {
    console.log(`Checking exact email: ${email}`);
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    // listUsers only returns 50 by default without pagination, but let's use it for a quick check or better use the search
    
    // There is no getByEmail directly in admin auth for all users easily without pagination or knowing the ID
    // but I'll use listUsers with a filter if possible, or just paginate again.
    
    let page = 1;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (found) return found;
        page++;
    }
    return null;
}

async function run() {
    const emails = ["mathiasgnobre@compromisso.com", "thiagovmartins@compromisso.com"];
    for (const email of emails) {
        const user = await checkExactEmail(email);
        if (user) {
            console.log(`FOUND: ${email} -> ID: ${user.id}`);
        } else {
            console.log(`NOT FOUND: ${email}`);
        }
    }
}

run().catch(console.error);
