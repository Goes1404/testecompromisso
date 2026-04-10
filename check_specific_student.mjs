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

async function checkStudent(email) {
  console.log(`Checking student: ${email}`);

  // Fetch from Profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
  } else {
    console.log("Profile:", profile);
  }

  // Fetch all auth users to find this user
  let thisUser = null;
  let page = 1;
  while (true) {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });
    if (listError || !users || users.length === 0) break;
    
    const user = users.find(u => u.email === email);
    if (user) {
      thisUser = user;
      break;
    }
    page++;
  }

  if (!thisUser) {
    console.log("User NOT FOUND in Auth Users.");
  } else {
    console.log("Auth User:", JSON.stringify(thisUser, null, 2));
  }
}

checkStudent('wendesonlira@compromisso.com');
