import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'priscilalima@compromisso.com';
  console.log(`Updating role to 'coordenadora' for: ${email}`);

  // Fetch Auth user
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
      console.error(userError);
      return;
  }
  
  const user = userData.users.find(u => u.email === email);
  if (user) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { role: 'admin', must_change_password: true }
    });
    if (updateError) {
        console.error("Auth update error:", updateError);
    } else {
        console.log("Auth metadata updated.");
    }

    // Update Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);
      
    if (profileError) {
       console.error("Profile update error:", profileError);
    } else {
       console.log("Profile updated successfully.");
    }
  } else {
    console.log("User not found!");
  }
}
run();
