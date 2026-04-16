
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = "07cb714c-3c86-46d3-979c-f585711f2836";
const newPassword = "compromisso2026";

async function resetPassword() {
    console.log(`--- RESETTING PASSWORD FOR: Luiza R. Gonçalves SIlva ---`);
    console.log(`User ID: ${userId}`);

    // 1. Update Auth password and metadata
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
            password: newPassword,
            user_metadata: { must_change_password: true } 
        }
    );

    if (authError) {
        console.error(`Error updating Auth user: ${authError.message}`);
        return;
    }
    console.log(`Successfully updated Auth password to "${newPassword}" and metadata.`);

    // 2. Update profiles table
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', userId);

    if (profileError) {
        console.error(`Error updating profile: ${profileError.message}`);
    } else {
        console.log(`Successfully updated profiles table (must_change_password: true).`);
    }

    console.log(`\nVerification:`);
    const { data: { user }, error: verifyError } = await supabase.auth.admin.getUserById(userId);
    if (user) {
        console.log(`- Auth must_change_password: ${user.user_metadata?.must_change_password}`);
    }

    const { data: profile, error: profileVerifyError } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', userId)
        .single();
    
    if (profile) {
        console.log(`- Profile must_change_password: ${profile.must_change_password}`);
    }
}

resetPassword().catch(console.error);
