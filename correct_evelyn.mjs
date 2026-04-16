
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function correctName() {
    const oldEmail = "evlynssantos@compromisso.com";
    const newEmail = "evelynssantos@compromisso.com";
    const newName = "Evelyn Silva dos Santos";

    console.log(`--- CORRECTING NAME FOR: ${oldEmail} ---`);

    // Find User
    let page = 1;
    let user = null;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        user = users.find(u => u.email.toLowerCase() === oldEmail.toLowerCase());
        if (user) break;
        page++;
    }

    if (!user) {
        console.error("User not found in Auth!");
        return;
    }

    const userId = user.id;
    console.log(`Found User ID: ${userId}`);

    // Update Auth
    console.log(`Updating Auth email and metadata...`);
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
        user_metadata: {
            ...user.user_metadata,
            full_name: newName,
            display_name: newName
        }
    });

    if (authError) {
        console.error(`Error updating Auth: ${authError.message}`);
        return;
    }

    // Update Profile
    console.log(`Updating Profile table...`);
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: newName,
            name: newName,
            email: newEmail,
            updated_at: new Date()
        })
        .eq('id', userId);

    if (profileError) {
        console.error(`Error updating Profile: ${profileError.message}`);
        return;
    }

    console.log(`\nSUCCESS!`);
    console.log(`Old: Evlyn -> New: Evelyn`);
    console.log(`New Email: ${newEmail}`);
}

correctName().catch(console.error);
