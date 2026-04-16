
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = "9c948784-a37d-49ce-9c6c-324ba451f9b6";

async function update() {
    console.log(`--- UPDATING MANUELE TO ENEM ---`);

    // 1. Update profiles table
    console.log("Updating profiles table...");
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            exam_target: 'ENEM',
            course: 'ENEM'
        })
        .eq('id', userId);

    if (profileError) {
        console.error("Error updating profile:", profileError.message);
    } else {
        console.log("Profile table updated successfully.");
    }

    // 2. Update Auth metadata
    console.log("Updating Auth metadata...");
    const { data: { user }, error: authFetchError } = await supabase.auth.admin.getUserById(userId);
    if (authFetchError) {
        console.error("Error fetching user:", authFetchError.message);
        return;
    }

    const newMetadata = {
        ...user.user_metadata,
        exam_target: 'ENEM',
        course: 'ENEM',
        study_focus: 'ENEM' // Supporting variations found in scripts
    };

    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: newMetadata
    });

    if (authError) {
        console.error("Error updating Auth metadata:", authError.message);
    } else {
        console.log("Auth metadata updated successfully.");
    }

    // 3. Verify
    console.log("\nVerifying updates...");
    const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    console.log("New Profile State:", JSON.stringify(updatedProfile, null, 2));
}

update().catch(console.error);
