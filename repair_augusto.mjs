
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function repairAugusto() {
  console.log('Cleaning up Augusto...');
  // Delete profiles with typos
  await supabase.from('profiles').delete().ilike('email', 'augusto%');
  
  // Note: we can't easily delete from auth.admin.listUsers without looping.
  // But let's just try to create the correct one now.
  const email = 'augustosalgado@compromisso.com';
  console.log('Provisioning correct Augusto:', email);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'compromisso2026',
    email_confirm: true,
    user_metadata: { role: 'teacher', full_name: 'Augusto Salgado', must_change_password: true }
  });

  if (error) {
     console.error('Auth error:', error.message);
     if (error.message.includes('already been registered')) {
        // Find existing correct user and update
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        if (user) {
           await supabase.auth.admin.updateUserById(user.id, {
             user_metadata: { role: 'teacher', full_name: 'Augusto Salgado', must_change_password: true }
           });
           await supabase.from('profiles').upsert({
              id: user.id,
              name: 'Augusto Salgado',
              email: email,
              role: 'teacher',
              profile_type: 'Professor de História e Sociologia',
              course: 'Professor de História e Sociologia',
              status: 'active'
           });
           console.log('Updated existing Augusto.');
        }
     }
  } else {
     await supabase.from('profiles').upsert({
        id: data.user.id,
        name: 'Augusto Salgado',
        email: email,
        role: 'teacher',
        profile_type: 'Professor de História e Sociologia',
        course: 'Professor de História e Sociologia',
        status: 'active'
     });
     console.log('Provisioned new Augusto.');
  }
}
repairAugusto();
