
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateEmail(name) {
    const nameParts = name.trim().split(' ').filter(p => p.length > 0);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    let secondNameInitial = '';
    if (nameParts.length >= 3) {
        secondNameInitial = nameParts[1][0].toLowerCase();
    }
    const emailPart = (firstName + secondNameInitial + lastName)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    return `${emailPart}@compromisso.com`;
}

async function runSync() {
    console.log('--- STARTING DEFINITIVE SYNC OF 702 STUDENTS ---');
    
    const content = fs.readFileSync('gen_full_list.js', 'utf8');
    
    // Extract RawDataENEM block
    const enemMatch = content.match(/const RawDataENEM = `([\s\S]*?)`;/);
    const etecMatch = content.match(/const RawDataETEC = `([\s\S]*?)`;/);
    
    if (!enemMatch || !etecMatch) {
        console.error('Could not find data blocks in gen_full_list.js');
        return;
    }
    
    const parseBlock = (raw, type) => {
        const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const res = [];
        for(let i=0; i < lines.length; i += 2) {
            const name = lines[i];
            const school = lines[i+1];
            if(!name || !school) continue;
            res.push({
                name,
                email: generateEmail(name),
                institution: school,
                exam_target: type
            });
        }
        return res;
    };
    
    const enemStudents = parseBlock(enemMatch[1], 'ENEM');
    const etecStudents = parseBlock(etecMatch[1], 'ETEC');
    
    // Deduplicate by email
    const studentMap = new Map();
    [...enemStudents, ...etecStudents].forEach(s => {
        const key = s.email.toLowerCase();
        if (!studentMap.has(key)) {
            studentMap.set(key, s);
        } else {
            // Optional: merge info if necessary
            // For now, we just keep the first occurrence as they are mostly the same
        }
    });

    const allStudents = Array.from(studentMap.values());
    console.log(`Total unique students to sync: ${allStudents.length}`);
    
    // Load ALL auth users to handle duplicates correctly
    console.log('Loading auth users...');
    let allAuthUsers = [];
    let page = 1;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || users.length === 0) break;
        allAuthUsers = allAuthUsers.concat(users);
        page++;
    }
    console.log(`Loaded ${allAuthUsers.length} auth users.`);
    
    const authMap = new Map(allAuthUsers.map(u => [u.email.toLowerCase(), u]));
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < allStudents.length; i++) {
        const s = allStudents[i];
        try {
            let userId;
            const existing = authMap.get(s.email.toLowerCase());
            
            if (existing) {
                userId = existing.id;
                // Update password and metadata
                const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                    password: 'compromisso2026',
                    user_metadata: {
                        full_name: s.name,
                        display_name: s.name,
                        role: 'student',
                        profile_type: 'student',
                        school: s.institution,
                        study_focus: s.exam_target,
                        must_change_password: true
                    }
                });
                if (updateError) console.warn(`Update error for ${s.email}: ${updateError.message}`);
            } else {
                // Create user
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: s.email,
                    password: 'compromisso2026',
                    email_confirm: true,
                    user_metadata: {
                        full_name: s.name,
                        display_name: s.name,
                        role: 'student',
                        profile_type: 'student',
                        school: s.institution,
                        study_focus: s.exam_target,
                        must_change_password: true
                    }
                });
                if (createError) throw createError;
                userId = newUser.user.id;
            }
            
            // Upsert Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: s.email,
                    full_name: s.name,
                    name: s.name,
                    institution: s.institution,
                    exam_target: s.exam_target,
                    profile_type: 'student',
                    status: 'active',
                    updated_at: new Date()
                }, { onConflict: 'id' });
            
            if (profileError) throw profileError;
            
            success++;
            if (success % 50 === 0) console.log(`Progress: ${success}/${allStudents.length}`);
        } catch (err) {
            console.error(`Error syncing ${s.name} (${s.email}):`, err.message);
            failed++;
        }
    }
    
    console.log('--- SYNC FINISHED ---');
    console.log(`Success: ${success}`);
    console.log(`Failed: ${failed}`);
}

runSync().catch(console.error);
