
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDistribution() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('profile_type');
    
    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    profiles.forEach(p => {
        counts[p.profile_type] = (counts[p.profile_type] || 0) + 1;
    });

    console.log('Profile Type Distribution:', counts);
}

checkDistribution();
