import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10000 });
  if (error) {
    console.error("Error fetching auth users:", error);
    return;
  }
  console.log("Total auth users:", users.length);

  const students = users.filter(u => u.user_metadata?.role === 'student' || !u.user_metadata?.role);
  console.log("Students (or no role) in auth.users:", students.length);
}

checkAuthUsers();
