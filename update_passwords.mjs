import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
   // Fetch all profiles from supabase
   console.log('Fetching all profiles...');
   let allProfiles = [];
   let from = 0;
   const step = 999;
   while (true) {
       const { data, error } = await supabase.from('profiles').select('id, email, role').range(from, from + step);
       if (error) {
           console.error('Error fetching profiles:', error);
           break;
       }
       if (!data || data.length === 0) break;
       allProfiles = allProfiles.concat(data);
       if (data.length <= step) break;
       from += step + 1;
   }
   console.log(`Found ${allProfiles.length} profiles.`);
   
   let count = 0;
   for (const profile of allProfiles) {
       if (profile.role === 'student' || profile.role === 'teacher') {
           const { error } = await supabase.auth.admin.updateUserById(profile.id, {
               password: 'compromisso2026'
           });
           if (error) {
               console.log(`Error updating password for ${profile.email}:`, error.message);
           } else {
               count++;
               if (count % 50 === 0) console.log(`Updated ${count} passwords...`);
           }
           await sleep(50); // slight delay to prevent rate limiting
       }
   }
   console.log(`Successfully reset passwords for ${count} users.`);
}

run();
