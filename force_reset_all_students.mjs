import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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

    // Filter to only those who are students (or have no role, which we assume is student if they are in profiles as student)
    // Actually, let's just fetch all Profiles that are 'student'
    console.log("Fetching student profiles...");
    const { data: studentProfiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'student');

    if (profileErr) {
        console.error("Error fetching profiles:", profileErr);
        process.exit(1);
    }
    console.log(`Total student profiles: ${studentProfiles.length}`);

    let updatedCount = 0;
    let errorCount = 0;

    // Create a Set of student IDs for fast lookup
    const studentIds = new Set(studentProfiles.map(p => p.id));
    
    // We will iterate ALL auth users. If their ID is in studentIds OR their user_metadata.role isn't specifically 'teacher'/'admin', we'll update them if they are considered students.
    // Actually, safets is: if ID in studentIds.
    let targetUsers = authUsers.filter(u => studentIds.has(u.id));

    // Also look for auth users who have role 'student' but might not be in profiles!
    const authStudentsOnly = authUsers.filter(u => u.user_metadata?.role === 'student' && !studentIds.has(u.id));
    console.log(`Found ${authStudentsOnly.length} users with 'student' role in auth metadata BUT NOT in profiles. Adding them to target.`);
    targetUsers = targetUsers.concat(authStudentsOnly);

    // One more check: users who have no role in auth metadata, but are in the raw data from the school? 
    // It's safer to just update all targetUsers we identified.
    console.log(`Total Target Students to Reset: ${targetUsers.length}`);

    for (const [index, user] of targetUsers.entries()) {
        try {
            const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
                password: 'compromisso2026',
                user_metadata: {
                    ...user.user_metadata,
                    role: 'student', // Ensure it's set
                    must_change_password: true
                }
            });

            if (error) {
                console.error(`[ERROR] Failed to update password for ${user.email}:`, error.message);
                errorCount++;
            } else {
                updatedCount++;
            }
            
            // Re-sync with Profile if missing
            if (!studentIds.has(user.id)) {
                console.log(`Creating missing profile for ${user.email}`);
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

            // Small delay to avoid rate limiting
            await sleep(10);
            
        } catch (err) {
            console.error(`[EXCEPTION] Error processing ${user.email}:`, err);
            errorCount++;
        }
    }

    console.log(`\n=== RESET PROCESS COMPLETED ===`);
    console.log(`Total students updated: ${updatedCount}`);
    console.log(`Total errors: ${errorCount}`);
}

main();
