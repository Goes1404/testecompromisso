import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    let authCount = 0;
    let authStudentCount = 0;
    let hasMore = true;
    let page = 1;

    console.log("Fetching Auth users...");
    while (hasMore) {
        const { data: users, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 1000
        });

        if (error) {
            console.error("Error fetching users:", error);
            break;
        }

        if (users.users.length === 0) {
            hasMore = false;
        } else {
            authCount += users.users.length;
            users.users.forEach(u => {
                if (u.user_metadata?.role === 'student' || !u.user_metadata?.role) { // Assume empty role is default or student
                    if(u.user_metadata?.role === 'student' || true) authStudentCount++;
                }
            });
            page++;
        }
    }

    console.log(`Total Auth Users: ${authCount}`);
    console.log(`Total possible Auth Students: ${authStudentCount}`);

    console.log("Fetching Profiles...");
    const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (profileError) {
        console.error("Error counting profiles:", profileError);
    } else {
        console.log(`Total Profiles: ${profileCount}`);
    }
    
    // Students in profiles
    const { count: studentProfileCount, error: sErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
        
    if (sErr) {
        console.error("Error counting student profiles:", sErr);
    } else {
        console.log(`Total Student Profiles: ${studentProfileCount}`);
    }
}

main();
