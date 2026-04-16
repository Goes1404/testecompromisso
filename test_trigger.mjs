
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const email = 'test-trigger-' + Date.now() + '@compromisso.com';
  console.log('Testing creation for:', email);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'compromisso2026',
    email_confirm: true,
    user_metadata: { full_name: 'Test Trigger', profile_type: 'student' }
  });

  if (error) {
    console.error('Final Error:', error);
  } else {
    console.log('Final Success:', data.user.id);
  }
}
test();
