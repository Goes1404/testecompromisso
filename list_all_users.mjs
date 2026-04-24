import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    let allUsers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page < 5) { // Limit to 5 pages for safety
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 100
        });

        if (error) {
            console.error('Error listing users:', error);
            break;
        }

        if (users.length === 0) {
            hasMore = false;
        } else {
            allUsers = allUsers.concat(users);
            page++;
        }
    }

    console.log(`Total users found in Auth: ${allUsers.length}`);
    
    const searchString = 'joelma';
    const matches = allUsers.filter(u => {
        const emailMatch = u.email && u.email.toLowerCase().includes(searchString);
        const nameMatch = u.user_metadata && (
            (u.user_metadata.full_name && u.user_metadata.full_name.toLowerCase().includes(searchString)) ||
            (u.user_metadata.name && u.user_metadata.name.toLowerCase().includes(searchString))
        );
        return emailMatch || nameMatch;
    });

    console.log('Matches for "joelma" in Auth:', matches.map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.user_metadata?.name || 'N/A'
    })));

    const macedoMatches = allUsers.filter(u => {
        const emailMatch = u.email && u.email.toLowerCase().includes('macedo');
        const nameMatch = u.user_metadata && (
            (u.user_metadata.full_name && u.user_metadata.full_name.toLowerCase().includes('macedo')) ||
            (u.user_metadata.name && u.user_metadata.name.toLowerCase().includes('macedo'))
        );
        return emailMatch || nameMatch;
    });

    console.log('Matches for "macedo" in Auth:', macedoMatches.map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.user_metadata?.name || 'N/A'
    })));
}

listAll();
