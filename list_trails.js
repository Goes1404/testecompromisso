
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTrails() {
  const { data, error } = await supabase.from('trails').select('id, title, category');
  if (error) {
    console.error('Error fetching trails:', error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

listTrails();
