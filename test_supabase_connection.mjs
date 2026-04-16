
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        console.log(`Total profiles: ${count}`);
        
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;
        console.log(`Auth users (first page): ${users.length}`);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
