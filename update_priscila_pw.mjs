import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'priscilalima@compromisso.com';

  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
      console.error(userError);
      return;
  }
  
  const user = userData.users.find(u => u.email === email);
  if (user) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'compromisso2026',
      user_metadata: { role: 'admin', must_change_password: true, name: 'Priscila Lima' }
    });
    if (updateError) {
        console.error("Auth update error:", updateError);
    } else {
        console.log("Priscila password updated successfully.");
    }
  } else {
    console.log("Priscila not found!");
  }
}
run();
