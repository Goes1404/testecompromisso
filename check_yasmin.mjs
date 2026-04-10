import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  const yasmin = users?.users?.filter(u => u.email.includes('yasmin'));
  console.log('Yasmin auth users:', JSON.stringify(yasmin, null, 2));

  const { data, error: profileErr } = await supabase.from('profiles').select('*').ilike('full_name', '%yasmin%');
  console.log('Yasmin profiles:', JSON.stringify(data, null, 2));
  
  if (yasmin && yasmin.length > 0) {
    const { error: resetErr } = await supabase.auth.admin.updateUserById(yasmin[0].id, { password: 'compromisso2026' });
    console.log('Password reset error?', resetErr);
  }
}
check();
