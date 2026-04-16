
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function tryCreate(name, email) {
    console.log(`Trying to create: ${name} (${email})`);
    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: 'compromisso2026',
        email_confirm: true
    });
    
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    
    const userId = data.user.id;
    console.log(`Success! ID: ${userId}`);
    
    await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
            full_name: name,
            display_name: name,
            role: 'student',
            profile_type: 'student',
            must_change_password: true
        }
    });
    
    await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: name,
        name: name,
        profile_type: 'student',
        status: 'active'
    });
}

async function run() {
    await tryCreate("Mathias G nobre", "mathiasgn@compromisso.com"); // shortened email maybe?
    await tryCreate("Thiago Vieira Martins", "thiagovm@compromisso.com"); // shortened email maybe?
}

run().catch(console.error);
