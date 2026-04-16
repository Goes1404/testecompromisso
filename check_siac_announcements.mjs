
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnnouncements() {
    console.log("Checking announcements for 'SIAC'...");
    const { data: dbAnnouncements, error } = await supabase
        .from('announcements')
        .select('*');

    if (error) {
        console.error("Error fetching announcements:", error.message);
        return;
    }

    const matches = dbAnnouncements.filter(a => 
        (a.title?.toUpperCase().includes("SIAC")) || 
        (a.message?.toUpperCase().includes("SIAC"))
    );

    if (matches.length > 0) {
        console.log("Found matches in announcements:");
        matches.forEach(m => console.log(`- ID: ${m.id}, Title: ${m.title}, Message: ${m.message}`));
    } else {
        console.log("No matches found in announcements.");
    }
}

checkAnnouncements().catch(console.error);
