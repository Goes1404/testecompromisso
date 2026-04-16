
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const userId = "07cb714c-3c86-46d3-979c-f585711f2836";
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
        console.error("Error fetching user:", error.message);
        return;
    }
    
    console.log("Auth User Details:");
    console.log(JSON.stringify(user, null, 2));
}

inspect().catch(console.error);
