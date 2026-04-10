import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let hasMore = true;
    let page = 1;
    let authUsers = [];

    console.log("Fetching all Auth users...");
    while (hasMore) {
        const { data: usersData, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 1000
        });

        if (error) {
            console.error("Error fetching auth users:", error);
            process.exit(1);
        }

        if (usersData.users.length === 0) {
            hasMore = false;
        } else {
            authUsers = authUsers.concat(usersData.users);
            page++;
        }
    }

    console.log(`Total Auth Users fetched: ${authUsers.length}`);

    console.log("Fetching ALL student profiles...");
    let allStudentProfiles = [];
    let fetchMore = true;
    let limit = 1000;
    let offset = 0;

    while (fetchMore) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('role', 'student')
            .range(offset, offset + limit - 1);
            
        if (error) {
             console.error("Error fetching profiles:", error);
             process.exit(1);
        }
        
        allStudentProfiles = allStudentProfiles.concat(data);
        if (data.length < limit) {
             fetchMore = false;
        } else {
             offset += limit;
        }
    }

    console.log(`Total student profiles completely fetched: ${allStudentProfiles.length}`);

    const studentIds = new Set(allStudentProfiles.map(p => p.id));
    
    let targetUsers = authUsers.filter(u => studentIds.has(u.id));
    const authStudentsOnly = authUsers.filter(u => u.user_metadata?.role === 'student' && !studentIds.has(u.id));
    targetUsers = targetUsers.concat(authStudentsOnly);

    console.log(`Total Target Students to Reset: ${targetUsers.length}`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const [index, user] of targetUsers.entries()) {
        try {
            const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
                password: 'compromisso2026',
                user_metadata: {
                    ...user.user_metadata,
                    role: 'student', 
                    must_change_password: true
                }
            });

            if (error) {
                console.error(`[ERROR] Failed to update password for ${user.email}:`, error.message);
                errorCount++;
            } else {
                updatedCount++;
            }

            if (!studentIds.has(user.id)) {
                await supabase.from('profiles').upsert({
                    id: user.id,
                    name: user.user_metadata?.name || user.email.split('@')[0],
                    email: user.email,
                    role: 'student',
                    updated_at: new Date().toISOString()
                });
            }

            if (updatedCount % 100 === 0) {
                console.log(`...Updated ${updatedCount}/${targetUsers.length}`);
            }

            await sleep(10);
        } catch (err) {
            console.error(`[EXCEPTION] Error processing ${user.email}:`, err);
            errorCount++;
        }
    }

    console.log(`\n=== RESET PROCESS COMPLETED (FIXED PAGINATION) ===`);
    console.log(`Total students updated: ${updatedCount}`);
    console.log(`Total errors: ${errorCount}`);
}

main();
