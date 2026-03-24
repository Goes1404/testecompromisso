
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use anon key for inspection if RLS allows

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllProfiles() {
  const { data, error } = await supabase.from('profiles').select('name, role, profile_type, email');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

listAllProfiles();
