import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStudents() {
  const emails = [
    'yurislima@compromisso.com',
    'yurisilva@compromisso.com',
    'yasmimpcelestino@compromisso.com',
    'yasminpcelestino@compromisso.com' // variants
  ];

  console.log('Checking Profiles...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .in('email', emails);

  if (pError) console.error('Profile Error:', pError);
  console.log('Profiles found:', profiles);

  console.log('\nChecking Auth Users...');
  const { data: { users }, error: aError } = await supabase.auth.admin.listUsers();
  
  if (aError) console.error('Auth Error:', aError);
  
  const foundUsers = users.filter(u => emails.includes(u.email));
  console.log('Auth Users found:', foundUsers.map(u => ({
    id: u.id,
    email: u.email,
    metadata: u.user_metadata
  })));
}

checkStudents();
